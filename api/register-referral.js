// api/register-referral.js — Server-side referral registration
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

        // 1. Check user (outside transaction)
        const newUserRef = db.collection('users').doc(newUserWallet);
        const newUserDoc = await newUserRef.get();

        if (newUserDoc.exists && newUserDoc.data().referredBy) {
            return res.status(400).json({ success: false, error: 'Already referred' });
        }

        if (newUserDoc.exists && newUserDoc.data().userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // 2. Find referrer by code (outside transaction)
        const snapshot = await db.collection('users').where('referralCode', '==', referrerCode).get();

        if (snapshot.empty) {
            return res.status(400).json({ success: false, error: 'Invalid referral code' });
        }

        let referrerWallet = null;
        snapshot.forEach(doc => { referrerWallet = doc.id; });

        // 3. Self-referral check
        if (referrerWallet === newUserWallet) {
            return res.status(400).json({ success: false, error: 'Cannot refer yourself' });
        }

        // 4. Transaction: ALL reads first, then ALL writes
        await db.runTransaction(async (transaction) => {
            // --- ALL READS FIRST ---
            const freshUserDoc = await transaction.get(newUserRef);
            const referrerRef = db.collection('users').doc(referrerWallet);
            const referrerDoc = await transaction.get(referrerRef);

            // Double-check inside transaction
            if (freshUserDoc.exists && freshUserDoc.data().referredBy) {
                throw new Error('Already referred');
            }

            const currentCount = referrerDoc.exists ? (referrerDoc.data().referralCount || 0) : 0;

            // --- ALL WRITES AFTER ---
            transaction.update(newUserRef, {
                referredBy: referrerWallet,
                referredByCode: referrerCode,
                referralDate: Date.now(),
                referralLocked: true
            });

            if (referrerDoc.exists) {
                transaction.update(referrerRef, {
                    referralCount: currentCount + 1
                });
            }
        });

        console.log(`✅ Referral: ${newUserWallet} referred by ${referrerWallet}`);
        return res.status(200).json({ success: true, referrerWallet });

    } catch (error) {
        console.error('Referral error:', error.message);
        return res.status(400).json({ success: false, error: error.message });
    }
};
