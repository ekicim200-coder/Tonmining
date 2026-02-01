# 🚀 TON Pro Miner - Telegram Mini App

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ekcicim200-coder/Tonmining)

## 🎯 Özellikler

- ✅ **TON Wallet Entegrasyonu** - TON Connect ile cüzdan bağlama
- ⭐ **Telegram Stars Ödemesi** - Mini app içi ödeme sistemi
- 🔥 **Firebase Backend** - Real-time veri senkronizasyonu
- 📱 **Responsive Design** - Mobil ve masaüstü uyumlu
- ⚡ **Serverless API** - Vercel functions ile backend

## 🚀 Hızlı Başlangıç

### 1. Telegram Bot Oluşturun
```
@BotFather → /newbot → Bot token'ı alın
```

### 2. Vercel'e Deploy Edin
[![Deploy](https://vercel.com/button)](https://vercel.com/new)

### 3. Environment Variables
```
TELEGRAM_BOT_TOKEN = your_bot_token_here
```

### 4. Webhook Kurun
```bash
curl -F "url=https://your-app.vercel.app/api/webhook" \
  https://api.telegram.org/bot<TOKEN>/setWebhook
```

## 📖 Detaylı Kurulum

Tüm adımlar için: **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** dosyasını okuyun.

## 🛠️ Teknoloji Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Firebase Firestore
- **Payment:** Telegram Stars API
- **Blockchain:** TON Connect

## 📦 Proje Yapısı

```
Tonmining-main/
├── api/
│   ├── create-invoice.js  # Stars invoice oluşturma
│   └── webhook.js         # Telegram webhook handler
├── index.html             # Ana sayfa
├── script.js              # Frontend logic
├── style.css              # Styles
├── firebase-config.js     # Firebase setup
├── vercel.json            # Vercel configuration
└── package.json           # Dependencies
```

## 🎮 Kullanım

1. Telegram'da bot'unuzu açın
2. Mini App'i başlatın
3. TON Wallet bağlayın
4. Market'ten mining makineleri satın alın
5. TON veya Stars ile ödeme yapın
6. Mining başlasın! 🚀

## 🔐 Güvenlik

- Bot token environment variable olarak saklanıyor
- Firebase Security Rules aktif
- CORS yapılandırması mevcut
- Webhook validasyonu yapılıyor

## 📊 API Endpoints

### POST `/api/create-invoice`
Telegram Stars invoice oluşturur.

**Body:**
```json
{
  "machineId": 1,
  "amount": 50,
  "userId": "firebase_user_id",
  "wallet": "TON_wallet_address"
}
```

### POST `/api/webhook`
Telegram webhook handler. Ödeme onaylarını işler.

## 🤝 Katkıda Bulunma

Pull request'ler kabul edilir! Büyük değişiklikler için önce issue açın.

## 📝 Lisans

MIT

## 🆘 Destek

Sorunlarla karşılaşırsanız:
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) dosyasını okuyun
2. Vercel logs kontrol edin
3. GitHub Issues açın

---

**Made with ❤️ for TON Community**
