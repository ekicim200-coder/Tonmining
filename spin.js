// api/spin.js — Server-side spin wheel validation
// Prevents: cooldown bypass, prize manipulation, unlimited spins

const { db } = require('./_firebase-admin');

const SPIN_SEGMENTS = [
    { value: 0.01, weight: 30 },
    { value: 0.05, weight: 20 },
    { value: 0.10, weight: 15 },
    { value: 0.50, weight: 5 },
    { value: 0.02, weight: 20 },
    { value: 0.25, weight: 6 },
    { value: 0.03, weight: 12 },
    { value: 1.00, weight: 2 }
];

function getServerWeightedSegment() {
    const totalWeight = SPIN_SEGMENTS.reduce((a, b) => a + b.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
        rand -= SPIN_SEGMENTS[i].weight;
        if (rand <= 0) return i;
    }
    return 0;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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

            // Check 24h cooldown SERVER-SIDE
            const lastSpin = userData.lastSpinTime || 0;
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;

            if (lastSpin && (now - lastSpin) < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastSpin)) / 1000);
                throw new Error(`Cooldown: ${remaining}s remaining`);
            }

            // Server determines prize (client CANNOT choose)
            const winIndex = getServerWeightedSegment();
            const prize = SPIN_SEGMENTS[winIndex].value;

            // Update balance and spin time atomically
            const newBalance = (userData.balance || 0) + prize;
            const newTotalEarned = (userData.totalEarned || 0) + prize;

            transaction.update(userRef, {
                balance: newBalance,
                totalEarned: newTotalEarned,
                lastSpinTime: now,
                lastSave: now
            });

            return { winIndex, prize, newBalance };
        });

        console.log(`🎰 Spin: ${walletAddress} won ${result.prize} TON (index: ${result.winIndex})`);

        return res.status(200).json({
            success: true,
            winIndex: result.winIndex,
            prize: result.prize,
            newBalance: result.newBalance
        });

    } catch (error) {
        console.error('Spin error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
