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
                            text: '✅ Ödeme başarılı! Mining makineniz hesabınıza eklendi.\n\n⚡ Uygulamayı açarak kontrol edebilirsiniz.'
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
            try {
                await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: update.message.chat.id,
                            text: '🚀 TON Pro Miner\'a hoş geldiniz!\n\n⛏ Madenciliğe başlamak için aşağıdaki butona tıklayın.',
                            reply_markup: {
                                inline_keyboard: [[
                                    {
                                        text: '⛏ Madenciliğe Başla',
                                        web_app: { url: 'https://tonmining.vercel.app?v=12' }
                                    }
                                ]]
                            }
                        })
                    }
                );
            } catch (e) {
                console.error('⚠️ Start mesajı hatası:', e.message);
            }
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('❌ Webhook genel hata:', error.message);
        return res.status(200).json({ error: error.message });
    }
};
