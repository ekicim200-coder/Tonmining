// api/_firebase-admin.js — Shared Firebase Admin SDK initialization
const admin = require('firebase-admin');

let db = null;
let initError = null;

try {
    if (!admin.apps.length) {
        // Support both: single JSON or 3 separate env variables
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        
        let serviceAccount;
        if (raw && raw !== '{}') {
            serviceAccount = JSON.parse(raw);
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = {
                type: 'service_account',
                project_id: process.env.FIREBASE_PROJECT_ID,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            };
        } else {
            throw new Error('Firebase credentials not configured');
        }
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || 'tonm-77373'
        });
    }
    db = admin.firestore();
} catch (e) {
    initError = e.message;
    console.error('❌ Firebase Admin init failed:', e.message);
}

module.exports = { admin, db, initError };
