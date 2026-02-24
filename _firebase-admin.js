// api/_firebase-admin.js — Shared Firebase Admin SDK initialization
// This file is prefixed with _ so Vercel doesn't treat it as an API route

const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'tonm-77373'
    });
}

const db = admin.firestore();

module.exports = { admin, db };
