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
            const caption = `⛏️ TON Pro Miner — Earn TON Daily\n\n━━━━━━━━━━━━━━━━━━━━\n\n💎 What is TON Pro Miner?\nBuy virtual mining machines and earn TON cryptocurrency daily. Withdraw your profits directly to your wallet!\n\n━━━━━━━━━━━━━━━━━━━━\n\n🔹 10 Mining Machines — Nano Chip to Plasma Core\n🔹 Daily Passive Income — Earn TON 24/7\n🔹 Free Rewards — Spin wheel, daily bonus, promo codes\n🔹 Referral System — Earn 40% from friends' purchases\n🔹 Clan System — Team up for mining speed bonus\n🔹 Rank System — Bronze to Legendary with perks\n🔹 18 Languages — Available worldwide\n\n━━━━━━━━━━━━━━━━━━━━\n\n🚀 Tap the button below to start mining!`;

            const buttons = {
                inline_keyboard: [
                    [{ text: '⛏️ Start Mining', web_app: { url: 'https://tonmining.vercel.app?v=19' } }],
                    [{ text: '📖 How It Works', url: 'https://tonmining.vercel.app/info.html' }]
                ]
            };

            let sent = false;

            // Try sending with photo first
            try {
                const photoRes = await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            photo: 'https://tonmining.vercel.app/banner.png',
                            caption: caption,
                            reply_markup: buttons
                        })
                    }
                );
                const photoData = await photoRes.json();
                if (photoData.ok) sent = true;
                else console.log('Photo failed:', photoData.description);
            } catch (e) {
                console.log('Photo fetch error:', e.message);
            }

            // Fallback: send as text message
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
