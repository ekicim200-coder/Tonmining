// api/webhook.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET ile webhook durumunu test et
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'Webhook aktif', timestamp: Date.now() });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN tanımlı değil!');
        return res.status(200).json({ error: 'Token missing' });
    }

    try {
        const update = req.body;
        console.log('📨 Webhook:', JSON.stringify(update).substring(0, 500));

        // ✅ PRE-CHECKOUT - HIZLI YANIT VERMELİ (10 saniye limiti var)
        if (update.pre_checkout_query) {
            const preCheckout = update.pre_checkout_query;
            console.log('💳 Pre-checkout:', preCheckout.id, 'Amount:', preCheckout.total_amount, 'Payload:', preCheckout.invoice_payload);
            
            try {
                const response = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pre_checkout_query_id: preCheckout.id,
                            ok: true
                        })
                    }
                );
                
                const data = await response.json();
                console.log('✅ Pre-checkout onaylandı:', data.ok);
                
                if (!data.ok) {
                    console.error('❌ Pre-checkout onay hatası:', data);
                }
            } catch (preErr) {
                console.error('❌ Pre-checkout fetch hatası:', preErr.message);
            }
            
            // Pre-checkout için HEMEN 200 dön
            return res.status(200).json({ ok: true });
        }

        // ✅ BAŞARILI ÖDEME
        if (update.message && update.message.successful_payment) {
            const payment = update.message.successful_payment;
            const rawPayload = payment.invoice_payload;
            
            let machineId = null;
            let userId = null;
            
            try {
                if (rawPayload && rawPayload.includes('_') && !rawPayload.startsWith('{')) {
                    const parts = rawPayload.split('_');
                    machineId = parseInt(parts[0]);
                    userId = parts[1];
                } else {
                    const parsed = JSON.parse(rawPayload);
                    machineId = parsed.machineId;
                    userId = parsed.userId;
                }
            } catch (e) {
                console.error('⚠️ Payload parse hatası:', rawPayload);
            }
            
            console.log('💰 Ödeme başarılı!', { machineId, userId, amount: payment.total_amount, from: update.message.from.id });

            try {
                await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: update.message.chat.id,
                            text: '✅ Payment successful! Your mining machine has been added.\n\n⚡ Open the app to check your new machine.'
                        })
                    }
                );
            } catch (e) {
                console.error('⚠️ Mesaj gönderilemedi:', e.message);
            }
            
            return res.status(200).json({ ok: true });
        }

        // ✅ /start KOMUTU
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const caption = `💎 TON Pro Miner — Start Earning TON Today!\n\n🔥 WHY 1,000,000+ MINERS CHOOSE US:\n\n✅ 100% FREE to Start — No investment needed\n✅ Machines Are PERMANENT — Buy once, earn forever\n✅ Real TON Withdrawals — Direct to your wallet\n✅ Earn While You Sleep — 24/7 passive income\n\n🎁 FREE BONUSES EVERY DAY:\n🎰 Daily Spin Wheel — Win up to 1 TON\n📅 Login Bonus — 7-day streak rewards\n🎟️ Promo Codes — Free machines & TON\n📺 Watch Ads — Free mining power\n\n💰 EARN EVEN MORE:\n👥 Invite Friends → Get 40% of their purchases\n🏰 Join a Clan → Up to +10% mining speed\n⭐ Rank Up → Up to +15% mining bonus\n\n⛏️ 10 Mining Machines from 5 TON\n🌍 Available in 18 Languages\n\n🚀 Tap below to claim your FREE rewards!`;

            const buttons = {
                inline_keyboard: [
                    [{ text: '🚀 Start Mining — It\'s FREE!', web_app: { url: 'https://tonmining.vercel.app?v=19' } }],
                    [{ text: '📖 How It Works', url: 'https://tonmining.vercel.app/info.html' }]
                ]
            };

            let sent = false;

            // Try sending with photo (fetch from own server, upload as multipart)
            try {
                const imgRes = await fetch('https://tonmining.vercel.app/banner.png');
                if (imgRes.ok) {
                    const imgBuffer = await imgRes.buffer();
                    const boundary = '----TonMinerBoundary' + Date.now();
                    
                    let body = '';
                    body += `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;
                    body += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
                    body += `--${boundary}\r\nContent-Disposition: form-data; name="reply_markup"\r\n\r\n${JSON.stringify(buttons)}\r\n`;
                    body += `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="banner.png"\r\nContent-Type: image/png\r\n\r\n`;
                    
                    const bodyStart = Buffer.from(body, 'utf8');
                    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
                    const fullBody = Buffer.concat([bodyStart, imgBuffer, bodyEnd]);
                    
                    const photoRes = await fetch(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                            body: fullBody
                        }
                    );
                    const photoData = await photoRes.json();
                    if (photoData.ok) sent = true;
                    else console.log('Photo upload failed:', photoData.description);
                }
            } catch (e) {
                console.log('Photo error:', e.message);
            }

            // Fallback: text only
            if (!sent) {
                try {
                    await fetch(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: caption,
                                reply_markup: buttons
                            })
                        }
                    );
                } catch (e2) {
                    console.error('Start message error:', e2.message);
                }
            }
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('❌ Webhook genel hata:', error.message);
        return res.status(200).json({ error: error.message });
    }
};
