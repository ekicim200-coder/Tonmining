// api/validate-purchase.js — Server-side machine grant after TON payment
// Prevents: adding machines without paying, hashrate manipulation
// 
// Flow: Client sends TON → gets tx hash → sends tx hash to this API → 
// Server validates and grants machine atomically

const { db, initError } = require('./_firebase-admin');

const MACHINES = {
    1:  { name: "Nano Chip",      price: 5,    rate: 3 },
    2:  { name: "Micro Core",     price: 15,   rate: 7 },
    3:  { name: "Basic Miner",    price: 35,   rate: 16 },
    4:  { name: "Dual Processor", price: 75,   rate: 35 },
    5:  { name: "Quad Engine",    price: 150,  rate: 69 },
    6:  { name: "Hexa Unit",      price: 300,  rate: 139 },
    7:  { name: "Quantum Node",   price: 600,  rate: 278 },
    8:  { name: "Fusion Reactor", price: 1200, rate: 556 },
    9:  { name: "Dark Matter",    price: 2500, rate: 1157 },
    10: { name: "Plasma Core",    price: 5000, rate: 2315 }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { walletAddress, userId, machineId, txHash } = req.body;

        if (!walletAddress || !userId || !machineId) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }

        const machine = MACHINES[machineId];
        if (!machine) {
            return res.status(400).json({ success: false, error: 'Invalid machine' });
        }

        // Check if this txHash was already used (prevent replay)
        if (txHash) {
            const txRef = db.collection('transactions').doc(txHash);
            const txDoc = await txRef.get();
            if (txDoc.exists) {
                return res.status(400).json({ success: false, error: 'Transaction already processed' });
            }
        }

        const userRef = db.collection('users').doc(walletAddress);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            if (userData.userId !== userId) throw new Error('Unauthorized');

            // Rate limit: max 10 purchases per hour
            const lastPurchase = userData.lastPurchaseTime || 0;
            const purchaseCount = userData.purchaseCountHour || 0;
            const oneHourAgo = Date.now() - 3600000;
            
            let newPurchaseCount = purchaseCount;
            if (lastPurchase < oneHourAgo) {
                newPurchaseCount = 0;
            }
            if (newPurchaseCount >= 10) {
                throw new Error('Purchase rate limit: max 10 per hour');
            }

            // Grant machine
            const currentInv = userData.inv || [];
            const currentHashrate = userData.hashrate || 0;

            const newInv = [...currentInv, { 
                mid: machineId, 
                uid: Date.now(), 
                bonus: false,
                grantedBy: 'server'
            }];

            const newHashrate = currentHashrate + machine.rate;

            const updateData = {
                inv: newInv,
                hashrate: newHashrate,
                lastSave: Date.now(),
                lastPurchaseTime: Date.now(),
                purchaseCountHour: newPurchaseCount + 1
            };

            transaction.update(userRef, updateData);

            // Record transaction to prevent replay
            if (txHash) {
                const txRef = db.collection('transactions').doc(txHash);
                transaction.set(txRef, {
                    walletAddress,
                    machineId,
                    machineName: machine.name,
                    price: machine.price,
                    timestamp: Date.now(),
                    type: 'ton_purchase'
                });
            }

            return { 
                newHashrate, 
                machineCount: newInv.length,
                machineName: machine.name 
            };
        });

        console.log(`🛒 Purchase validated: ${walletAddress} bought ${result.machineName} | HR: ${result.newHashrate}`);

        return res.status(200).json({
            success: true,
            newHashrate: result.newHashrate,
            machineCount: result.machineCount,
            machineName: result.machineName
        });

    } catch (error) {
        console.error('Purchase validation error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
