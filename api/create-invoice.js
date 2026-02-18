// api/create-invoice.js
const fetch = require('node-fetch');

const MACHINES = {
    1: { name: "Basic Chip v1", starPrice: 50, rate: 5 },
    2: { name: "Dual Core X", starPrice: 150, rate: 15 },
    3: { name: "Quantum Processor", starPrice: 375, rate: 40 },
    4: { name: "Fusion Reactor", starPrice: 750, rate: 90 },
    5: { name: "ASIC Miner", starPrice: 2000, rate: 250 }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { machineId, userId, wallet } = req.body;
        
        console.log('📥 Invoice isteği:', { machineId, userId, wallet: wallet ? wallet.substring(0,8) + '...' : 'yok' });

        if (!machineId || !userId) {
            console.error('❌ Eksik alanlar:', { machineId, userId });
            return res.status(400).json({ success: false, error: 'machineId ve userId gerekli' });
        }

        const machine = MACHINES[machineId];
        if (!machine) {
            console.error('❌ Geçersiz makine:', machineId);
            return res.status(400).json({ success: false, error: 'Geçersiz makine ID: ' + machineId });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN env variable tanımlı değil!');
            return res.status(500).json({ success: false, error: 'Server yapılandırma hatası: Bot token eksik' });
        }

        const payload = `${machineId}_${userId}`;

        const invoiceData = {
            title: machine.name,
            description: `Mining Hardware: ${machine.name} (+${machine.rate} GH/s)`,
            payload: payload,
            provider_token: '',
            currency: 'XTR',
            prices: [{ label: machine.name, amount: machine.starPrice }]
        };

        console.log('📤 Telegram API çağrılıyor:', { title: machine.name, amount: machine.starPrice, payload });

        const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        const response = await fetch(`${TELEGRAM_API_URL}/createInvoiceLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        });

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Invoice oluşturuldu:', data.result);
            return res.status(200).json({ success: true, invoiceLink: data.result });
        } else {
            console.error('❌ Telegram API hatası:', data);
            return res.status(400).json({ 
                success: false, 
                error: data.description || 'Invoice oluşturulamadı',
                errorCode: data.error_code
            });
        }

    } catch (error) {
        console.error('❌ Sunucu hatası:', error.message, error.stack);
        return res.status(500).json({ success: false, error: 'Sunucu hatası: ' + error.message });
    }
};
