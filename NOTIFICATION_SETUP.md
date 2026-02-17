# 📱 TON Pro Miner - Bildirim Sistemi Kurulum Kılavuzu

Bu kılavuz, bildirim sistemini kurmak için gereken adımları açıklar.

## 🎯 Özellikler

### 1. Telegram Bot Bildirimleri
- ✅ Kullanıcılara Telegram bot üzerinden bildirim gönderme
- ✅ Özelleştirilebilir bildirim tipleri (başarı, uyarı, hata, bilgi)
- ✅ Hazır bildirim şablonları
- ✅ Toplu bildirim (broadcast) desteği

### 2. Browser Push Bildirimleri
- ✅ Web tarayıcısı bildirimleri
- ✅ Arka plan bildirimleri (Service Worker)
- ✅ Offline destek
- ✅ Tıklanabilir bildirimler

## 🔧 Kurulum Adımları

### 1. Telegram Bot Oluşturma

1. **BotFather'a Git**
   - Telegram'da @BotFather'ı aç
   - `/newbot` komutunu gönder
   - Bot adını belirle (örn: "TON Pro Miner Bot")
   - Username belirle (örn: "tonprominer_bot")

2. **Bot Token'ı Al**
   - BotFather size bir token verecek (örn: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - Bu token'ı güvenli bir yere kaydet

3. **Bot'u Yapılandır**
   ```
   /setdescription - Bot açıklaması ekle
   /setabouttext - Bot hakkında bilgi ekle
   /setuserpic - Bot profil fotoğrafı ekle
   ```

### 2. Vercel'e Deploy Etme

1. **Environment Variables Ekle**
   Vercel dashboard'da:
   ```
   TELEGRAM_BOT_TOKEN = your_bot_token_here
   ```

2. **package.json Güncelle**
   ```json
   {
     "dependencies": {
       "node-fetch": "^2.6.1"
     }
   }
   ```

3. **Deploy Et**
   ```bash
   vercel --prod
   ```

### 3. Telegram Bot'u Kullanıma Açma

Bot'unuzun çalışması için kullanıcıların:
1. Bot'u Telegram'da bulması ve `/start` göndermesi gerekir
2. Ardından uygulama içinden "Enable Telegram Notifications" toggle'ını açması gerekir

### 4. Browser Bildirimleri İçin Gereksinimler

1. **HTTPS Gerekli**
   - Browser bildirimleri sadece HTTPS sitelerinde çalışır
   - Vercel otomatik olarak HTTPS sağlar

2. **Service Worker Kaydı**
   - `sw.js` dosyası root dizinde olmalı
   - Dosyalar otomatik olarak kaydedilir

## 📝 Kullanım Örnekleri

### Telegram Bildirimi Gönderme

```javascript
// Mining başladığında
await window.telegramNotifications.notifications.miningStarted('GPU Rig Pro');

// Ödül kazanıldığında
await window.telegramNotifications.notifications.rewardEarned('5.5');

// Çekim tamamlandığında
await window.telegramNotifications.notifications.withdrawalSuccess('100');

// Yeni referans
await window.telegramNotifications.notifications.newReferral('@username');

// Özel mesaj
await window.telegramNotifications.send('Custom message here', 'success');
```

### Browser Bildirimi Gönderme

```javascript
// İzin iste (ilk kullanımda)
await window.browserNotifications.requestPermission();

// Basit bildirim
await window.browserNotifications.send('Title', {
  body: 'Message body',
  icon: '/icon.png'
});

// Hazır şablon
await window.browserNotifications.notifications.dailyBonus('10');
await window.browserNotifications.notifications.purchaseSuccess('GPU Rig', '50');
```

## 🎨 Bildirim Tipleri

### Telegram Bot
- `success` ✅ - Başarılı işlemler
- `warning` ⚠️ - Uyarılar
- `error` ❌ - Hatalar
- `info` ℹ️ - Bilgilendirmeler
- `mining` ⛏️ - Mining işlemleri
- `reward` 🎁 - Ödüller
- `withdrawal` 💰 - Çekimler

### Browser
- Mining güncellemeleri
- Ödül bildirimleri
- Sistem uyarıları
- Günlük hatırlatıcılar

## 🔐 Güvenlik

1. **Bot Token'ı Gizli Tutun**
   - Token'ı asla frontend kodunda kullanmayın
   - Environment variable olarak saklayın

2. **Rate Limiting**
   - Spam'i önlemek için rate limiting ekleyin
   - Kullanıcı başına dakikada max 5 bildirim

3. **Kullanıcı Onayı**
   - Bildirimleri sadece kullanıcı izni ile gönderin
   - Abonelikten çıkma seçeneği sunun

## 📊 Firebase Entegrasyonu (Opsiyonel)

Kullanıcı bildirim tercihlerini saklamak için:

```javascript
// Firebase'e tercih kaydetme
await firebase.firestore().collection('users').doc(userId).set({
  notifications: {
    telegram: {
      enabled: true,
      chatId: '123456789',
      types: {
        mining: true,
        rewards: true,
        withdrawals: true
      }
    },
    browser: {
      enabled: true,
      types: {
        daily: true,
        system: true
      }
    }
  }
}, { merge: true });
```

## 🧪 Test Etme

1. **Notification Settings** sayfasına git
2. "Test Telegram" veya "Test Browser" butonlarına tıkla
3. Bildirimlerin geldiğini doğrula

## ❓ Sorun Giderme

### Telegram Bildirimleri Gelmiyor
- Bot token'ı doğru mu?
- Kullanıcı bot'a `/start` gönderdi mi?
- Vercel environment variables ayarlandı mı?

### Browser Bildirimleri Gelmiyor
- Site HTTPS mi?
- İzin verildi mi?
- Service Worker kaydedildi mi?

## 📱 Telegram Bot Komutları

Kullanıcılar için bot komutları:

```
/start - Bot'u başlat ve bildirim al
/stop - Bildirimleri durdur
/status - Bildirim durumunu kontrol et
/help - Yardım menüsü
```

Bu komutları bot'unuza eklemek için @BotFather'da:
```
/setcommands
```

## 🚀 İleri Seviye Özellikler

1. **Zamanlanmış Bildirimler**
   - Günlük bonus hatırlatmaları
   - Mining raporu (günlük/haftalık)

2. **Kişiselleştirilmiş Bildirimler**
   - Kullanıcı dilini tespit et
   - Özel bildirim zamanları

3. **Analytics**
   - Bildirim açılma oranları
   - En popüler bildirim türleri

## 📞 Destek

Sorunlarınız için:
- GitHub Issues
- Telegram Support: @your_support_username
- Email: support@tonprominer.com

---

**Not:** Bu sistem production kullanımı için hazırdır. Rate limiting ve spam koruması ekleyin.
