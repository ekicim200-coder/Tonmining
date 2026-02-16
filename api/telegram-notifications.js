// Telegram Bot Bildirim Sistemi
// Vercel serverless function olarak çalışır

import fetch from 'node-fetch';

// TELEGRAM BOT TOKEN'ınızı buraya ekleyin
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, chatId, message, notificationType } = req.body;

    switch (action) {
      case 'subscribe':
        // Kullanıcıyı bildirim listesine ekle
        return await subscribeUser(chatId, res);

      case 'send':
        // Belirli bir kullanıcıya bildirim gönder
        return await sendNotification(chatId, message, notificationType, res);

      case 'broadcast':
        // Tüm kullanıcılara bildirim gönder (admin işlemi)
        return await broadcastNotification(message, req.body.userIds, res);

      case 'checkSubscription':
        // Kullanıcının bot'a abone olup olmadığını kontrol et
        return await checkSubscription(chatId, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Kullanıcıya bildirim gönder
async function sendNotification(chatId, message, type = 'info', res) {
  const emoji = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    mining: '⛏️',
    reward: '🎁',
    withdrawal: '💰'
  };

  const formattedMessage = `${emoji[type] || emoji.info} ${message}`;

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json({ success: true, messageId: data.result.message_id });
    } else {
      return res.status(400).json({ success: false, error: data.description });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Toplu bildirim gönder
async function broadcastNotification(message, userIds, res) {
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };

  for (const userId of userIds) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();
      if (data.ok) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ userId, error: data.description });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ userId, error: error.message });
    }
  }

  return res.status(200).json(results);
}

// Kullanıcının bot'a abone olup olmadığını kontrol et
async function checkSubscription(chatId, res) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId })
    });

    const data = await response.json();
    
    return res.status(200).json({ 
      subscribed: data.ok,
      chatInfo: data.ok ? data.result : null
    });
  } catch (error) {
    return res.status(500).json({ subscribed: false, error: error.message });
  }
}

// Kullanıcıyı abone et (Firebase'e kaydet)
async function subscribeUser(chatId, res) {
  // Bu kısım Firebase ile entegre edilmeli
  // Şimdilik basit bir onay dönüyoruz
  return res.status(200).json({ 
    success: true, 
    message: 'User subscribed to notifications',
    chatId 
  });
}
