// api/webhook.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
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
        const update = req.body;
        console.log('📨 Webhook alındı:', JSON.stringify(update, null, 2));

        // Pre-checkout query onayı
        if (update.pre_checkout_query) {
            const preCheckout = update.pre_checkout_query;
            console.log('✅ Pre-checkout onaylanıyor...');
            
            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            if (!TELEGRAM_BOT_TOKEN) {
                console.error('❌ Bot token bulunamadı!');
                return res.status(500).json({ error: 'Bot token missing' });
            }
            
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
            console.log('Pre-checkout yanıtı:', data);
        }

        // Başarılı ödeme işlemi
        if (update.message && update.message.successful_payment) {
            const payment = update.message.successful_payment;
            const rawPayload = payment.invoice_payload;
            
            // ✅ DÜZELTME: Payload artık "machineId_userId" formatında düz string
            // Eski kod JSON.parse() yapıyordu ve çöküyordu
            let machineId = null;
            let userId = null;
            let wallet = null;
            
            try {
                // Önce yeni format dene: "3_123456789"
                if (rawPayload && rawPayload.includes('_')) {
                    const parts = rawPayload.split('_');
                    machineId = parseInt(parts[0]);
                    userId = parts[1];
                } else {
                    // Eski JSON formatı desteği (geriye uyumluluk)
                    const parsed = JSON.parse(rawPayload);
                    machineId = parsed.machineId;
                    userId = parsed.userId;
                    wallet = parsed.wallet;
                }
            } catch (parseError) {
                console.error('⚠️ Payload parse edilemedi:', rawPayload);
                // Parse edilemese bile ödemeyi kaydet
                machineId = rawPayload;
            }
            
            console.log('💰 Ödeme başarılı!', {
                machineId: machineId,
                userId: userId,
                wallet: wallet,
                amount: payment.total_amount,
                telegramUserId: update.message.from.id,
                rawPayload: rawPayload
            });

            // Kullanıcıya onay mesajı gönder
            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            if (TELEGRAM_BOT_TOKEN) {
                try {
                    await fetch(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: update.message.chat.id,
                                text: `✅ Ödeme başarılı! Mining makineniz hesabınıza eklendi.`
                            })
                        }
                    );
                } catch (msgError) {
                    console.error('⚠️ Mesaj gönderilemedi:', msgError);
                }
            }
        }

        // /start komutu işleme
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
            if (TELEGRAM_BOT_TOKEN) {
                try {
                    await fetch(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: update.message.chat.id,
                                text: '🚀 TON Pro Miner\'a hoş geldiniz! Uygulamayı açmak için aşağıdaki butona tıklayın.',
                                reply_markup: {
                                    inline_keyboard: [[
                                        {
                                            text: '⛏ Madenciliğe Başla',
                                            web_app: { url: 'https://tonmining.vercel.app' }
                                        }
                                    ]]
                                }
                            })
                        }
                    );
                } catch (msgError) {
                    console.error('⚠️ Start mesajı gönderilemedi:', msgError);
                }
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Webhook hatası:', error);
        // Webhook'lar her zaman 200 döndürmeli, yoksa Telegram tekrar dener
        res.status(200).json({ error: error.message });
    }
};
