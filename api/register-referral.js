// api/register-referral.js — Server-side referral registration
// Fixes: client can't update another user's doc due to Firestore rules

const { db, initError } = require('./_firebase-admin');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (initError || !db) return res.status(503).json({ success: false, error: 'Server not configured' });

    try {
        const { newUserWallet, userId, referrerCode } = req.body;

        if (!newUserWallet || !userId || !referrerCode) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }

        // 1. Check if user already has a referrer
        const newUserRef = db.collection('users').doc(newUserWallet);
        const newUserDoc = await newUserRef.get();

        if (newUserDoc.exists && newUserDoc.data().referredBy) {
            return res.status(400).json({ success: false, error: 'Already referred' });
        }

        // Verify userId matches
        if (newUserDoc.exists && newUserDoc.data().userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // 2. Find referrer by code
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('referralCode', '==', referrerCode).get();

        if (snapshot.empty) {
            return res.status(400).json({ success: false, error: 'Invalid referral code' });
        }

        let referrerWallet = null;
        snapshot.forEach(doc => { referrerWallet = doc.id; });

        // 3. Self-referral check
        if (referrerWallet === newUserWallet) {
            return res.status(400).json({ success: false, error: 'Cannot refer yourself' });
        }

        // 4. Use transaction for atomicity
        await db.runTransaction(async (transaction) => {
            // Update new user: set referredBy
            transaction.update(newUserRef, {
                referredBy: referrerWallet,
                referredByCode: referrerCode,
                referralDate: Date.now(),
                referralLocked: true
            });

            // Update referrer: increment referralCount
            const referrerRef = db.collection('users').doc(referrerWallet);
            const referrerDoc = await transaction.get(referrerRef);

            if (referrerDoc.exists) {
                const currentCount = referrerDoc.data().referralCount || 0;
                transaction.update(referrerRef, {
                    referralCount: currentCount + 1
                });
            }
        });

        console.log(`✅ Referral registered: ${newUserWallet} referred by ${referrerWallet}`);

        return res.status(200).json({
            success: true,
            referrerWallet: referrerWallet
        });

    } catch (error) {
        console.error('Referral registration error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
