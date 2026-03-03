// api/promo.js — Server-side promo code redemption
const { db, initError } = require('./_firebase-admin');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { action } = req.body;

        // ==================== ADMIN: CREATE PROMO ====================
        if (action === 'create') {
            const { code, rewardType, rewardAmount, maxUses, expiresIn, adminKey } = req.body;

            if (adminKey !== (process.env.ADMIN_KEY || 'tonmining2025')) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }

            if (!code || !rewardType || !rewardAmount) {
                return res.status(400).json({ success: false, error: 'Missing fields' });
            }

            const promoRef = db.collection('promoCodes').doc(code.toUpperCase());
            const existing = await promoRef.get();
            if (existing.exists) {
                return res.status(400).json({ success: false, error: 'Code already exists' });
            }

            await promoRef.set({
                code: code.toUpperCase(),
                rewardType,        // 'ton', 'machine', 'spin'
                rewardAmount,       // TON amount, machine ID, or spin count
                maxUses: maxUses || 100,
                usedCount: 0,
                usedBy: [],
                createdAt: Date.now(),
                expiresAt: expiresIn ? Date.now() + (expiresIn * 3600000) : null, // hours to ms
                active: true
            });

            return res.status(200).json({ success: true, message: 'Promo created: ' + code.toUpperCase() });
        }

        // ==================== ADMIN: LIST PROMOS ====================
        if (action === 'list') {
            const { adminKey } = req.body;
            if (adminKey !== (process.env.ADMIN_KEY || 'tonmining2025')) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }

            const snapshot = await db.collection('promoCodes').orderBy('createdAt', 'desc').get();
            const promos = [];
            snapshot.forEach(doc => promos.push({ id: doc.id, ...doc.data() }));

            return res.status(200).json({ success: true, promos });
        }

        // ==================== ADMIN: DELETE PROMO ====================
        if (action === 'delete') {
            const { code, adminKey } = req.body;
            if (adminKey !== (process.env.ADMIN_KEY || 'tonmining2025')) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }

            await db.collection('promoCodes').doc(code).delete();
            return res.status(200).json({ success: true, message: 'Deleted' });
        }

        // ==================== USER: REDEEM PROMO ====================
        if (action === 'redeem') {
            const { code, walletAddress, userId } = req.body;

            if (!code || !walletAddress || !userId) {
                return res.status(400).json({ success: false, error: 'Missing fields' });
            }

            const promoCode = code.toUpperCase();
            const promoRef = db.collection('promoCodes').doc(promoCode);
            const promoDoc = await promoRef.get();

            if (!promoDoc.exists || !promoDoc.data().active) {
                return res.status(400).json({ success: false, error: 'Invalid promo code' });
            }

            const promo = promoDoc.data();

            // Check expiry
            if (promo.expiresAt && Date.now() > promo.expiresAt) {
                return res.status(400).json({ success: false, error: 'Promo code expired' });
            }

            // Check usage limit
            if (promo.usedCount >= promo.maxUses) {
                return res.status(400).json({ success: false, error: 'Promo code fully redeemed' });
            }

            // Check if user already used this code
            if (promo.usedBy && promo.usedBy.includes(walletAddress)) {
                return res.status(400).json({ success: false, error: 'Already used this code' });
            }

            // Verify user exists
            const userRef = db.collection('users').doc(walletAddress);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                return res.status(400).json({ success: false, error: 'User not found' });
            }

            if (userDoc.data().userId !== userId) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }

            const userData = userDoc.data();
            const updates = {};
            let rewardDesc = '';

            // Apply reward based on type
            if (promo.rewardType === 'ton') {
                updates.balance = (userData.balance || 0) + promo.rewardAmount;
                rewardDesc = `+${promo.rewardAmount} TON`;

            } else if (promo.rewardType === 'machine') {
                const inv = userData.inv || [];
                inv.push({ mid: promo.rewardAmount, uid: Date.now(), bonus: true });

                // Machine hashrates
                const machineRates = { 1:3, 2:7, 3:16, 4:35, 5:69, 6:139, 7:278, 8:556, 9:1157, 10:2315 };
                const rate = machineRates[promo.rewardAmount] || 0;

                updates.inv = inv;
                updates.hashrate = (userData.hashrate || 0) + rate;
                rewardDesc = `Free machine #${promo.rewardAmount} (+${rate} GH/s)`;

            } else if (promo.rewardType === 'spin') {
                // Reset spin timer so user can spin again
                updates.lastSpinTime = 0;
                rewardDesc = 'Free spin!';
            }

            // Apply updates
            await userRef.update(updates);

            // Update promo usage (use arrayUnion for usedBy)
            const admin = require('firebase-admin');
            await promoRef.update({
                usedCount: admin.firestore.FieldValue.increment(1),
                usedBy: admin.firestore.FieldValue.arrayUnion(walletAddress)
            });

            console.log(`🎁 Promo ${promoCode} redeemed by ${walletAddress}: ${rewardDesc}`);

            return res.status(200).json({
                success: true,
                rewardType: promo.rewardType,
                rewardAmount: promo.rewardAmount,
                rewardDesc
            });
        }

        return res.status(400).json({ success: false, error: 'Invalid action' });

    } catch (error) {
        console.error('Promo error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
