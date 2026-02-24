// api/_firebase-admin.js — Shared Firebase Admin SDK initialization
// This file is prefixed with _ so Vercel doesn't treat it as an API route

const admin = require('firebase-admin');

let db = null;
let initError = null;

try {
    if (!admin.apps.length) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw || raw === '{}') {
            throw new Error('FIREBASE_SERVICE_ACCOUNT env variable not configured');
        }
        const serviceAccount = JSON.parse(raw);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'tonm-77373'
        });
    }
    db = admin.firestore();
} catch (e) {
    initError = e.message;
    console.error('❌ Firebase Admin init failed:', e.message);
}

module.exports = { admin, db, initError };
