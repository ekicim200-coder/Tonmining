// api/push-notify.js — Send push notifications via Telegram Bot
// Sends spin ready, bonus available, and custom messages

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(500).json({ success: false, error: 'Bot token not configured' });

    try {
        const { chatId, message, type } = req.body;

        if (!chatId) return res.status(400).json({ success: false, error: 'chatId required' });

        // Build message based on type
        let text = message;
        if (type === 'spin_ready') {
            text = '🎰 Your daily spin is ready!\n\nSpin the wheel now to win free TON! 💰';
        } else if (type === 'bonus_ready') {
            text = '🎁 Daily login bonus is waiting!\n\nClaim your reward before the streak resets! 🔥';
        } else if (type === 'offline_earnings') {
            text = '⛏️ Your miners are working!\n\nYou have unclaimed offline earnings. Come collect them! 💎';
        }

        if (!text) return res.status(400).json({ success: false, error: 'message required' });

        // Send via Telegram Bot API
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '🚀 Open TON Miner',
                            web_app: { url: 'https://tonmining.vercel.app?v=17' }
                        }
                    ]]
                }
            })
        });

        const result = await response.json();
        
        if (result.ok) {
            return res.status(200).json({ success: true });
        } else {
            console.error('Telegram API error:', result);
            return res.status(400).json({ success: false, error: result.description });
        }
    } catch (error) {
        console.error('Push notify error:', error);
        return res.status(500).json({ success: false, error: 'Internal error' });
    }
};
