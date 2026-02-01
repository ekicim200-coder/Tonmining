// Backend API Örneği - Telegram Stars Invoice Oluşturma
// Bu dosyayı Node.js/Express backend'inizde kullanabilirsiniz

const express = require('express');
const router = express.Router();

// Telegram Bot Token'ınızı buraya ekleyin
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';

router.post('/create-invoice', async (req, res) => {
    try {
        const { machineId, amount, userId, wallet } = req.body;
        
        // Telegram Stars invoice oluştur
        const invoiceData = {
            title: `Mining Machine #${machineId}`,
            description: 'TON Mining Hardware Purchase',
            payload: JSON.stringify({ machineId, userId, wallet }),
            provider_token: '', // Stars için boş bırakılır
            currency: 'XTR', // Telegram Stars currency code
            prices: [
                {
                    label: 'Mining Machine',
                    amount: amount // Star miktarı
                }
            ]
        };
        
        // Telegram Bot API'ye istek gönder
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceData)
            }
        );
        
        const data = await response.json();
        
        if (data.ok) {
            res.json({ 
                success: true, 
                invoiceLink: data.result 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: data.description 
            });
        }
        
    } catch (error) {
        console.error('Invoice creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Webhook endpoint - Ödeme onayı için
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        // Başarılı ödeme kontrolü
        if (update.message && update.message.successful_payment) {
            const payment = update.message.successful_payment;
            const payload = JSON.parse(payment.invoice_payload);
            
            // Burada ödemeyi onaylayıp kullanıcıya makineyi verebilirsiniz
            console.log('Payment received:', {
                machineId: payload.machineId,
                userId: payload.userId,
                wallet: payload.wallet,
                amount: payment.total_amount
            });
            
            // Firebase'e kaydet veya diğer işlemleri yap
            // await grantMachineToUser(payload.userId, payload.machineId);
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});

module.exports = router;
