// api/reward.js
// ✅ DÜZELTME: export default → module.exports (CommonJS)
// Proje CommonJS kullanıyor, ES module syntax Vercel'de hata veriyordu
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { userid } = req.query;
    console.log(`Ödül verildi: ${userid}`);
    return res.status(200).json({ success: true, message: 'OK' });
};
