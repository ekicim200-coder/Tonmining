// api/create-invoice.js
const fetch = require('node-fetch');

// Makine fiyatları
const MACHINES = {
    1: { name: "Starter CPU", starPrice: 50, rate: 5 },
    2: { name: "GTX 1660", starPrice: 150, rate: 15 },
    3: { name: "RTX 3060", starPrice: 375, rate: 40 },
    4: { name: "RTX 4090", starPrice: 750, rate: 90 },
    5: { name: "ASIC Miner", starPrice: 2000, rate: 250 }
};

module.exports = async (req, res) => {
    // CORS ayarları
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { machineId, userId, wallet } = req.body;
        
        if (!machineId || !userId || !wallet) {
            return res.status(400).json({ 
                success: false, 
                error: 'Gerekli alanlar eksik' 
            });
        }

        const machine = MACHINES[machineId];
        if (!machine) {
            return res.status(400).json({ 
                success: false, 
                error: 'Geçersiz makine ID' 
            });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('❌ Bot token bulunamadı!');
            return res.status(500).json({ 
                success: false, 
                error: 'Bot token yapılandırılmamış' 
            });
        }

        const payloadData = {
            machineId: machineId,
            userId: userId,
            wallet: wallet,
            timestamp: Date.now()
        };
        const payload = JSON.stringify(payloadData);

        const invoiceData = {
            title: machine.name,
            description: `Mining Hardware: ${machine.name} (+${machine.rate} GH/s)`,
            payload: payload,
            provider_token: '',
            currency: 'XTR',
            prices: [{
                label: machine.name,
                amount: machine.starPrice
            }]
        };

        console.log('📤 Invoice oluşturuluyor:', machine.name);

        const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        const response = await fetch(
            `${TELEGRAM_API_URL}/createInvoiceLink`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            }
        );

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Invoice oluşturuldu');
            return res.status(200).json({ 
                success: true, 
                invoiceLink: data.result 
            });
        } else {
            console.error('❌ Telegram API Hatası:', data.description);
            return res.status(400).json({ 
                success: false, 
                error: data.description || 'Invoice oluşturulamadı' 
            });
        }

    } catch (error) {
        console.error('❌ Sunucu hatası:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası: ' + error.message 
        });
    }
};