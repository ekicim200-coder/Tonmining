// api/claim-task.js — Server-side task claim validation
const { db, initError } = require('./_firebase-admin');

const TASK_REWARDS = {
    'connect_wallet': 0.10, 'buy_first': 0.20, 'buy_5': 0.50, 'buy_10': 1.00,
    'first_spin': 0.10, 'first_ad': 0.10, 'ref_1': 0.30, 'ref_5': 1.00,
    'ref_20': 3.00, 'streak_7': 0.50, 'earn_10': 0.50, 'earn_100': 2.00,
    'reach_silver': 0.50, 'reach_gold': 1.00, 'reach_diamond': 3.00, 'join_clan': 0.20
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { walletAddress, userId, taskId } = req.body;
        if (!walletAddress || !userId || !taskId) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }

        const reward = TASK_REWARDS[taskId];
        if (!reward) {
            return res.status(400).json({ success: false, error: 'Invalid task' });
        }

        const userRef = db.collection('users').doc(walletAddress);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');
            const userData = userDoc.data();
            if (userData.userId !== userId) throw new Error('Unauthorized');

            // Check if already claimed
            const claimedTasks = userData.claimedTasks || [];
            if (claimedTasks.includes(taskId)) {
                throw new Error('Already claimed');
            }

            // Validate task completion server-side
            let completed = false;
            const inv = userData.inv || [];
            const paidInv = inv.filter(i => i.mid !== 999);

            switch (taskId) {
                case 'connect_wallet': completed = true; break; // They have wallet if calling API
                case 'buy_first': completed = paidInv.length >= 1; break;
                case 'buy_5': completed = paidInv.length >= 5; break;
                case 'buy_10': completed = paidInv.length >= 10; break;
                case 'first_spin': completed = (userData.lastSpinTime || 0) > 0; break;
                case 'first_ad': completed = (userData.lastAdTime || 0) > 0; break;
                case 'ref_1': completed = (userData.referralCount || 0) >= 1; break;
                case 'ref_5': completed = (userData.referralCount || 0) >= 5; break;
                case 'ref_20': completed = (userData.referralCount || 0) >= 20; break;
                case 'streak_7': completed = (userData.loginStreak || 0) >= 7; break;
                case 'earn_10': completed = (userData.totalEarned || 0) >= 10; break;
                case 'earn_100': completed = (userData.totalEarned || 0) >= 100; break;
                case 'reach_silver': completed = (userData.totalEarned || 0) >= 50; break;
                case 'reach_gold': completed = (userData.totalEarned || 0) >= 200; break;
                case 'reach_diamond': completed = (userData.totalEarned || 0) >= 1000; break;
                case 'join_clan': completed = !!userData.clanId; break;
                default: completed = false;
            }

            if (!completed) throw new Error('Task not completed');

            const newBalance = (userData.balance || 0) + reward;
            const newClaimed = [...claimedTasks, taskId];

            transaction.update(userRef, {
                balance: newBalance,
                claimedTasks: newClaimed
            });

            return { newBalance, reward };
        });

        console.log(`🏆 Task ${taskId}: +${result.reward} TON → ${walletAddress}`);
        return res.status(200).json({ success: true, reward: result.reward, newBalance: result.newBalance });

    } catch (error) {
        console.error('Task claim error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
