// api/free-node.js — Server-side free node (ad reward) validation
// Prevents: freeEnd manipulation, unlimited free hashrate

const { db, initError } = require('./_firebase-admin');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { walletAddress, userId } = req.body;

        if (!walletAddress || !userId) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }

        const userRef = db.collection('users').doc(walletAddress);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            if (userData.userId !== userId) throw new Error('Unauthorized');

            // Check cooldown: min 60 seconds between ad claims
            const lastAd = userData.lastAdTime || 0;
            const now = Date.now();

            if (lastAd && (now - lastAd) < 60000) {
                throw new Error('Ad cooldown: wait 60 seconds');
            }

            // Check if free node is already active
            const freeEnd = userData.freeEnd || 0;
            if (freeEnd > now) {
                throw new Error('Free node already active');
            }

            // Max 20 ad rewards per day
            const todayStr = new Date().toISOString().split('T')[0];
            const adCountToday = userData.adCountToday || 0;
            const adCountDate = userData.adCountDate || '';

            let newAdCount = adCountToday;
            if (adCountDate !== todayStr) {
                newAdCount = 0;
            }
            if (newAdCount >= 20) {
                throw new Error('Max 20 ad rewards per day');
            }

            // Grant 30 minutes of free hashrate
            const newFreeEnd = now + (30 * 60 * 1000);

            transaction.update(userRef, {
                freeEnd: newFreeEnd,
                lastAdTime: now,
                adCountToday: newAdCount + 1,
                adCountDate: todayStr,
                lastSave: now
            });

            return { freeEnd: newFreeEnd };
        });

        console.log(`📺 Free node granted: ${walletAddress} until ${new Date(result.freeEnd).toISOString()}`);

        return res.status(200).json({
            success: true,
            freeEnd: result.freeEnd
        });

    } catch (error) {
        console.error('Free node error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
