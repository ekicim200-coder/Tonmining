// api/webhook.js
const fetch = require('node-fetch'); // ← EKLE

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

        if (update.pre_checkout_query) {
            const preCheckout = update.pre_checkout_query;
            console.log('✅ Pre-checkout onaylanıyor...');
            
            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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

        if (update.message && update.message.successful_payment) {
            const payment = update.message.successful_payment;
            const payload = JSON.parse(payment.invoice_payload);
            
            console.log('💰 Ödeme başarılı!', {
                machineId: payload.machineId,
                userId: payload.userId,
                wallet: payload.wallet,
                amount: payment.total_amount,
                telegramUserId: update.message.from.id
            });

            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
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
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Webhook hatası:', error);
        res.status(500).json({ error: error.message });
    }
};
