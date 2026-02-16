# 🎮 TON Pro Miner - Complete Setup Package

**Telegram tabanlı TON madencilik oyunu - Tam kurulmuş bildirim sistemi ile!**

## ✨ Özellikler

### 🎯 Ana Özellikler
- ⛏️ Sanal TON madenciliği
- 🛒 Cihaz satın alma sistemi
- 💰 Çekim sistemi
- 👥 Referral programı
- 🏆 Liderlik tablosu
- 📱 Tam responsive tasarım

### 🔔 Bildirim Sistemi
- ✅ **Telegram Bot Bildirimleri** - Kullanıcılara Telegram üzerinden bildirim
- ✅ **Browser Push Notifications** - Web tarayıcısı bildirimleri
- ✅ **Firebase Entegrasyonu** - Bildirim geçmişi ve tercihleri
- ✅ **Hazır Şablonlar** - Mining, ödül, çekim, referral bildirimleri
- ✅ **Ayarlanabilir** - Kullanıcılar bildirimleri özelleştirebilir

## 🚀 Hızlı Kurulum

### 1️⃣ Telegram Bot Oluşturun

```
1. @BotFather'ı Telegram'da açın
2. /newbot komutunu gönderin
3. Bot adı: "TON Pro Miner Bot"
4. Username: "tonprominer_bot" (ya da benzeri)
5. Bot token'ı alın ve kaydedin
```

### 2️⃣ Dosyaları Hazırlayın

```bash
# Dosyaları extract edin
unzip tonmining-notifications.zip
cd tonmining-main

# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin ve bot token'ınızı ekleyin
nano .env  # ya da herhangi bir text editor
```

### 3️⃣ Vercel'e Deploy Edin

```bash
# Vercel CLI yükleyin (ilk kez)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Deploy sırasında Environment Variables ekleyin:
- `TELEGRAM_BOT_TOKEN` = your_bot_token_here

### 4️⃣ Bot Komutlarını Ayarlayın

@BotFather'da:
```
/setcommands

Sonra bu metni yapıştırın:
start - Start receiving notifications
stop - Stop notifications  
status - Check notification status
help - Get help
```

## 📂 Dosya Yapısı

```
tonmining-main/
├── index.html                          # Ana sayfa
├── notification-settings.html          # Bildirim ayarları
├── style.css                          # Stil dosyası
├── script.js                          # Ana JavaScript
├── firebase-config.js                 # Firebase + Notification DB
├── telegram-notification-manager.js   # Telegram bildirimleri
├── browser-notification-manager.js    # Browser bildirimleri
├── notification-integration.js        # Entegrasyon katmanı
├── sw.js                             # Service Worker
├── install.sh                        # Otomatik kurulum script
├── api/
│   ├── telegram-notifications.js     # Telegram API endpoint
│   ├── create-invoice.js            # TON ödemeler
│   ├── webhook.js                   # Telegram webhook
│   └── reward.js                    # Ödül sistemi
├── NOTIFICATION_SETUP.md            # Detaylı kurulum kılavuzu
├── QUICK_START.md                   # Hızlı başlangıç
└── README.md                        # Bu dosya
```

## 🔧 Yapılandırma

### Environment Variables (.env)

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
FIREBASE_API_KEY=your_firebase_api_key
APP_URL=https://your-app.vercel.app
```

### Vercel Environment Variables

Vercel Dashboard → Settings → Environment Variables:

1. `TELEGRAM_BOT_TOKEN` - Telegram bot token'ınız
2. `FIREBASE_API_KEY` - Firebase API key (opsiyonel)

## 📱 Kullanım

### Bildirim Sistemini Test Etme

1. Uygulamanızı açın
2. Header'daki 🔔 bildirim ikonuna tıklayın
3. "Enable Telegram Notifications" toggle'ını açın
4. "Test Telegram" butonuna tıklayın
5. Telegram'da bildirimi kontrol edin

### Kod İçinde Bildirim Gönderme

```javascript
// Mining başladı
await window.notificationSystem.notifyMiningStarted('GPU Rig Pro', userId);

// Ödül kazanıldı
await window.notificationSystem.notifyRewardEarned('5.5', userId);

// Satın alma tamamlandı
await window.notificationSystem.notifyPurchaseComplete('GPU Rig', '50', userId);

// Çekim durumu
await window.notificationSystem.notifyWithdrawal('100', 'complete', userId);

// Yeni referral
await window.notificationSystem.notifyNewReferral('@username', userId);
```

## 🎨 Bildirim Tipleri

### Telegram Bot Bildirimleri
- ⛏️ Mining güncellemeleri
- 🎁 Ödül bildirimleri
- 💰 Çekim durumu
- 👥 Referral bildirimleri
- ⚠️ Sistem uyarıları

### Browser Bildirimleri
- 🔔 Anlık push bildirimleri
- 📊 Günlük hatırlatmalar
- 💻 Arka plan desteği (Service Worker)
- 🎯 Tıklanabilir bildirimler

## 🔐 Güvenlik

- ✅ Environment variables ile token güvenliği
- ✅ Rate limiting (spam koruması)
- ✅ Kullanıcı izni tabanlı bildirimler
- ✅ .gitignore ile hassas dosya koruması

## 📊 Firebase Entegrasyonu

Firebase kullanarak:
- Bildirim geçmişi kaydedilir
- Kullanıcı tercihleri saklanır
- Okunmamış bildirim sayısı tutulur
- Bildirim analytics'i yapılabilir

## 🐛 Sorun Giderme

### Telegram bildirimleri gelmiyor
1. Bot token doğru mu kontrol edin
2. Kullanıcı bot'a `/start` gönderdi mi?
3. Vercel env variables ayarlandı mı?

### Browser bildirimleri gelmiyor
1. Site HTTPS mi?
2. İzin verildi mi? (tarayıcı ayarları)
3. Service Worker kaydedildi mi?

### Deploy hataları
```bash
# Debug mode ile deploy
vercel --debug

# Logs kontrol
vercel logs your-deployment-url
```

## 📚 Dokümantasyon

- **NOTIFICATION_SETUP.md** - Detaylı bildirim kurulumu
- **QUICK_START.md** - Hızlı başlangıç kılavuzu
- **API Docs** - `/api` klasöründeki dosyalar

## 🆘 Destek

Sorunlarınız için:
- 📧 Email: support@tonprominer.com
- 💬 Telegram: @your_support_username
- 🐛 GitHub Issues: [repository-url]

## 📄 Lisans

MIT License - Ticari kullanım için uygundur

## 🎉 Başarılar!

Artık tam teşekküllü bir TON madencilik oyununuz var, bildirim sistemiyle birlikte!

### Sonraki Adımlar:
1. ✅ Bot token'ınızı ekleyin
2. ✅ Vercel'e deploy edin
3. ✅ Test edin
4. ✅ Kullanıcılarla paylaşın

---

**Made with ❤️ for TON Community**
