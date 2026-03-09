// api/cron-notify.js — Scheduled notification sender (Vercel Cron)
// Runs daily, checks users who haven't visited and sends reminders
// Add to vercel.json: { "crons": [{ "path": "/api/cron-notify", "schedule": "0 12 * * *" }] }

const { db, initError } = require('./_firebase-admin');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Verify cron secret or allow manual trigger
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (initError || !db) return res.status(503).json({ error: 'Firebase not configured' });

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token missing' });

    try {
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

        // Get users who have chatId and haven't been active in 24h+
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        let notified = 0;
        let errors = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Skip if no chatId
            if (!data.telegramChatId) continue;
            
            // Skip if already notified recently (prevent spam)
            const lastNotify = data.lastNotifyTime || 0;
            if (now - lastNotify < 23 * 60 * 60 * 1000) continue; // Min 23h between notifs
            
            const lastSave = data.lastSave || 0;
            
            // User inactive for 24-48h → send "come back" message
            if (lastSave < twentyFourHoursAgo && lastSave > fortyEightHoursAgo) {
                try {
                    let text = '⛏️ Your miners miss you!\n\n';
                    
                    // Check if spin is ready
                    const lastSpin = data.lastSpinTime || 0;
                    if (now - lastSpin >= 24 * 60 * 60 * 1000) {
                        text += '🎰 Daily spin is ready!\n';
                    }
                    
                    // Check if daily bonus available
                    const today = new Date().toISOString().split('T')[0];
                    if (data.lastLoginDate !== today) {
                        text += '🎁 Daily bonus waiting!\n';
                    }
                    
                    // Show balance
                    const balance = (data.balance || 0).toFixed(2);
                    text += `\n💰 Balance: ${balance} TON\n\nCome collect your earnings! 🚀`;
                    
                    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: data.telegramChatId,
                            text: text,
                            reply_markup: {
                                inline_keyboard: [[{
                                    text: '🚀 Open TON Miner',
                                    web_app: { url: 'https://tonmining.vercel.app?v=17' }
                                }]]
                            }
                        })
                    });
                    
                    // Update last notify time
                    await db.collection('users').doc(doc.id).update({ lastNotifyTime: now });
                    notified++;
                } catch (e) {
                    errors++;
                    console.error(`Notify error for ${doc.id}:`, e.message);
                }
            }
        }

        console.log(`📬 Cron notify: ${notified} sent, ${errors} errors`);
        return res.status(200).json({ success: true, notified, errors });

    } catch (error) {
        console.error('Cron notify error:', error);
        return res.status(500).json({ error: error.message });
    }
};
