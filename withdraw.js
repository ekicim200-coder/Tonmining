// api/withdraw.js — Server-side validated withdrawal
// Critical security: ALL balance checks happen on server, NOT client

const { admin, db, initError } = require('./_firebase-admin');

// Mining rate constant (must match client)
const MINING_RATE = 0.000001; // TON per GH/s per second

// Machine definitions (single source of truth)
const MACHINES = {
    1: { rate: 3 }, 2: { rate: 7 }, 3: { rate: 16 }, 4: { rate: 35 },
    5: { rate: 69 }, 6: { rate: 139 }, 7: { rate: 278 }, 8: { rate: 556 },
    9: { rate: 1157 }, 10: { rate: 2315 }, 999: { rate: 300 }
};

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { walletAddress, amount, userId } = req.body;

        // --- STEP 1: Input validation ---
        if (!walletAddress || !amount || !userId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const withdrawAmount = Number(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        if (withdrawAmount < 100) {
            return res.status(400).json({ success: false, error: 'Minimum withdrawal is 100 TON' });
        }

        // Max single withdrawal cap
        if (withdrawAmount > 50000) {
            return res.status(400).json({ success: false, error: 'Maximum single withdrawal is 50,000 TON' });
        }

        // --- STEP 2: Rate limiting (max 3 withdrawals per 24h) ---
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentWithdrawals = await db.collection('withdrawals')
            .where('walletAddress', '==', walletAddress)
            .where('requestDate', '>', oneDayAgo)
            .get();

        if (recentWithdrawals.size >= 3) {
            return res.status(429).json({ success: false, error: 'Maximum 3 withdrawals per 24 hours' });
        }

        // --- STEP 3: Atomic balance check + deduction using Firestore Transaction ---
        const userRef = db.collection('users').doc(walletAddress);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();

            // Verify userId matches (prevent cross-account withdrawal)
            if (userData.userId !== userId) {
                throw new Error('User ID mismatch — unauthorized');
            }

            // --- STEP 4: Server-side balance calculation ---
            // Read stored balance + calculate any offline earnings since lastSave
            let serverBalance = userData.balance || 0;
            const serverHashrate = userData.hashrate || 0;
            const lastSave = userData.lastSave || Date.now();
            
            // Calculate offline earnings since last save (server-side)
            const secondsSinceLastSave = (Date.now() - lastSave) / 1000;
            if (secondsSinceLastSave > 30 && serverHashrate > 0) {
                const offlineEarnings = secondsSinceLastSave * serverHashrate * MINING_RATE;
                serverBalance += offlineEarnings;
            }

            // --- STEP 5: Validate balance is sufficient ---
            if (serverBalance < withdrawAmount) {
                throw new Error(`Insufficient balance. Server balance: ${serverBalance.toFixed(4)}, Requested: ${withdrawAmount}`);
            }

            // --- STEP 6: Validate balance is plausible ---
            // Calculate maximum possible balance based on inventory
            const inv = userData.inv || [];
            let totalHashrate = 0;
            inv.forEach(item => {
                const machine = MACHINES[item.id];
                if (machine) totalHashrate += machine.rate;
            });

            // Check if stored hashrate matches inventory
            if (serverHashrate > totalHashrate + 300) { // +300 for free node
                console.warn(`⚠️ SUSPICIOUS: ${walletAddress} hashrate=${serverHashrate} but inventory total=${totalHashrate}`);
                throw new Error('Balance integrity check failed — hashrate mismatch');
            }

            // --- STEP 7: Atomic deduction ---
            const newBalance = serverBalance - withdrawAmount;
            
            transaction.update(userRef, {
                balance: newBalance,
                lastSave: Date.now(),
                lastWithdrawal: Date.now()
            });

            // --- STEP 8: Create withdrawal record ---
            const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
            
            transaction.set(withdrawalRef, {
                walletAddress: walletAddress,
                amount: withdrawAmount,
                status: 'pending',
                requestDate: Date.now(),
                userId: userId,
                processedDate: null,
                serverBalanceBefore: serverBalance,
                serverBalanceAfter: newBalance,
                serverHashrate: serverHashrate,
                inventoryCount: inv.length,
                ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
            });

            return {
                withdrawalId,
                newBalance,
                amount: withdrawAmount
            };
        });

        console.log(`✅ Withdrawal approved: ${walletAddress} | Amount: ${result.amount} TON | New balance: ${result.newBalance.toFixed(4)}`);

        return res.status(200).json({
            success: true,
            withdrawalId: result.withdrawalId,
            newBalance: result.newBalance,
            amount: result.amount
        });

    } catch (error) {
        console.error(`❌ Withdrawal failed: ${error.message}`);
        
        // Don't expose internal details to client
        const safeErrors = [
            'Missing required fields', 'Invalid amount', 'Minimum withdrawal is 100 TON',
            'Maximum single withdrawal is 50,000 TON', 'Maximum 3 withdrawals per 24 hours',
            'User not found', 'Insufficient balance'
        ];
        
        const clientMessage = safeErrors.find(e => error.message.includes(e)) || 'Withdrawal failed';
        
        return res.status(400).json({ 
            success: false, 
            error: clientMessage
        });
    }
};
