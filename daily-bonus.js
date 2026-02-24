// api/daily-bonus.js — Server-side daily login bonus
// Prevents: streak reset bypass, double claiming, day manipulation

const { db } = require('./_firebase-admin');

const DAILY_REWARDS = [
    { day: 1, amount: 0.05 },
    { day: 2, amount: 0.10 },
    { day: 3, amount: 0.20 },
    { day: 4, amount: 0.35 },
    { day: 5, amount: 0.50 },
    { day: 6, amount: 0.75 },
    { day: 7, amount: 1.00 }
];

function getTodayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
        const today = getTodayStr();
        const yesterday = getYesterdayStr();

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const userData = userDoc.data();
            if (userData.userId !== userId) throw new Error('Unauthorized');

            // Already claimed today?
            if (userData.lastLoginDate === today) {
                throw new Error('Already claimed today');
            }

            // Calculate streak SERVER-SIDE
            let newStreak;
            if (userData.lastLoginDate === yesterday) {
                newStreak = Math.min((userData.loginStreak || 0) + 1, 7);
            } else {
                newStreak = 1;
            }

            const reward = DAILY_REWARDS[newStreak - 1];
            if (!reward) throw new Error('Invalid streak');

            const newBalance = (userData.balance || 0) + reward.amount;
            const newTotalEarned = (userData.totalEarned || 0) + reward.amount;

            transaction.update(userRef, {
                balance: newBalance,
                totalEarned: newTotalEarned,
                loginStreak: newStreak,
                lastLoginDate: today,
                lastSave: Date.now()
            });

            return { streak: newStreak, reward: reward.amount, newBalance };
        });

        console.log(`📅 Daily bonus: ${walletAddress} Day ${result.streak} = +${result.reward} TON`);

        return res.status(200).json({
            success: true,
            streak: result.streak,
            reward: result.reward,
            newBalance: result.newBalance
        });

    } catch (error) {
        console.error('Daily bonus error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
