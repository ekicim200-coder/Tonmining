// Dosya: api/reward.js
export default function handler(req, res) {
    const { userid } = req.query;
    console.log(`Ödül verildi: ${userid}`);
    return res.status(200).send('OK');
}
