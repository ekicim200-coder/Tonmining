// api/webhook.js
// Telegram'dan ödeme onaylarını alır ve Firebase'e yazar

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Firebase Admin SDK - sadece ilk çağrıda initialize et
let firebaseApp;
let db;

function initFirebase() {
  if (!firebaseApp) {
    firebaseApp = initializeApp({
      credential: {
        // Vercel'de FIREBASE_SERVICE_ACCOUNT env variable olarak ekleyeceğiz
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }
    });
    db = getFirestore(firebaseApp);
  }
  return db;
}

// Telegram webhook signature doğrulama
function verifyTelegramWebhook(body, signature) {
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
  return hash === signature;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Webhook signature doğrula (opsiyonel ama önerilen)
    const signature = req.headers['x-telegram-bot-api-secret-token'];
    // Basit kontrol için şimdilik atlayabiliriz

    const update = req.body;
    console.log('Webhook received:', JSON.stringify(update, null, 2));

    // Pre-checkout query (ödeme öncesi onay)
    if (update.pre_checkout_query) {
      const preCheckoutQueryId = update.pre_checkout_query.id;
      
      // Ödemeyi onayla
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: preCheckoutQueryId,
            ok: true
          })
        }
      );

      return res.status(200).json({ ok: true });
    }

    // Başarılı ödeme
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;
      const payload = JSON.parse(payment.invoice_payload);

      console.log('Payment successful:', {
        userId,
        amount: payment.total_amount,
        machineId: payload.machineId
      });

      // Firebase'e makine ekle
      const db = initFirebase();
      const telegramUserRef = db.collection('users').doc(`TG_${userId}`);

      // Kullanıcı verisini al
      const userDoc = await telegramUserRef.get();
      let userData = userDoc.exists ? userDoc.data() : {
        balance: 0,
        hashrate: 0,
        inv: [],
        freeEnd: 0,
        telegramUserId: userId
      };

      // Makine rate'lerini tanımla
      const machineRates = {
        1: 5,
        2: 15,
        3: 40,
        4: 90,
        5: 250
      };

      // Makineyi ekle
      const machineRate = machineRates[payload.machineId] || 0;
      userData.hashrate += machineRate;
      userData.inv.push({
        mid: payload.machineId,
        uid: Date.now()
      });
      userData.lastSave = Date.now();

      // Firebase'e kaydet
      await telegramUserRef.set(userData, { merge: true });

      console.log('✅ Machine added to Firebase for user:', userId);

      // Kullanıcıya başarı mesajı gönder
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: `✅ Purchase Successful!\n\n+${machineRate} GH/s added to your account.\n\nOpen the app to see your new mining power!`
          })
        }
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
