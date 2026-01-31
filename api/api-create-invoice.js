// api/create-invoice.js
// Telegram Bot API ile invoice URL oluşturur

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Vercel'de environment variable olarak ekleyeceğiz

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { machineId, machineName, price, userId } = req.body;

    if (!machineId || !machineName || !price || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Telegram Stars fiyatı (10 TON = 100 Stars)
    const starsPrice = Math.ceil(price * 10);

    // Telegram Bot API'sine invoice gönder
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: machineName,
          description: `Mining hardware upgrade - ${machineName}`,
          payload: JSON.stringify({
            machineId,
            userId,
            timestamp: Date.now()
          }),
          currency: 'XTR', // Telegram Stars
          prices: [
            {
              label: machineName,
              amount: starsPrice
            }
          ]
        })
      }
    );

    const data = await telegramResponse.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return res.status(500).json({ 
        error: 'Failed to create invoice',
        details: data.description 
      });
    }

    // Invoice URL'ini döndür
    return res.status(200).json({
      success: true,
      invoiceUrl: data.result
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
