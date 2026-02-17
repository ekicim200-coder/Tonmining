# 🚀 TON Pro Miner - Adım Adım Kurulum Rehberi

## 📋 BAŞLAMADAN ÖNCE GEREKLİ OLANLAR

- [ ] Telegram hesabı
- [ ] Vercel hesabı (ücretsiz - vercel.com)
- [ ] Bilgisayarınızda Node.js yüklü (nodejs.org)

---

## ADIM 1: TELEGRAM BOT OLUŞTURUN (5 dakika)

### 1.1 BotFather'ı Açın
1. Telegram'ı açın
2. Arama kısmına `@BotFather` yazın
3. Mavi tik işaretli resmi BotFather'ı seçin
4. "START" butonuna basın

### 1.2 Yeni Bot Oluşturun
BotFather'a şu mesajları sırayla gönderin:

```
/newbot
```

Sonra:
```
TON Pro Miner Bot
```
(Ya da istediğiniz başka bir isim)

Sonra bot kullanıcı adı (sonunda "bot" olmalı):
```
tonprominer_bot
```
(Ya da başka bir username, müsait olmalı)

### 1.3 Token'ı Kaydedin
BotFather size şöyle bir token verecek:
```
123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

⚠️ **ÖNEMLİ**: Bu token'ı bir yere kopyalayın, lazım olacak!

### 1.4 Bot Komutlarını Ayarlayın (İsteğe Bağlı)
BotFather'a:
```
/setcommands
```

Sonra şunu yapıştırın:
```
start - Bildirimleri başlat
stop - Bildirimleri durdur
status - Bildirim durumunu kontrol et
help - Yardım
```

✅ **Telegram botu hazır!**

---

## ADIM 2: DOSYALARI HAZIRLAYIN (2 dakika)

### 2.1 Zip Dosyasını İndirin ve Açın
1. İndirdiğiniz `tonmining-complete-ready.zip` dosyasını bulun
2. Sağ tık → "Extract" / "Ayıkla"
3. Klasörü açın

### 2.2 .env Dosyasını Oluşturun
1. `.env.example` dosyasını bulun
2. Sağ tık → Kopyala
3. Aynı klasöre yapıştır
4. İsmini `.env` olarak değiştir

### 2.3 Bot Token'ı Ekleyin
1. `.env` dosyasını not defteri ile açın
2. Şu satırı bulun:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```
3. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` kısmını SİLİN
4. Kendi bot token'ınızı yapıştırın
5. Kaydedin ve kapatın

✅ **Dosyalar hazır!**

---

## ADIM 3: VERCEL HESABI OLUŞTURUN (3 dakika)

### 3.1 Vercel'e Kaydolun
1. https://vercel.com adresine gidin
2. "Sign Up" butonuna tıklayın
3. GitHub, GitLab ya da Email ile kaydolun
4. Email doğrulaması yapın

✅ **Vercel hesabınız hazır!**

---

## ADIM 4: VERCEL CLI KURUN (2 dakika)

### 4.1 Node.js Kontrol Edin
Komut satırını (Terminal / CMD) açın ve yazın:
```bash
node --version
```

Eğer versiyon görüyorsanız (örn: v18.0.0) devam edin.
Görmüyorsanız nodejs.org'dan Node.js indirin.

### 4.2 Vercel CLI Yükleyin
Komut satırına yazın:
```bash
npm install -g vercel
```

Bekleyin, yüklenecek...

### 4.3 Vercel'e Giriş Yapın
```bash
vercel login
```

Tarayıcı açılacak, Vercel hesabınızla giriş yapın.

✅ **Vercel CLI hazır!**

---

## ADIM 5: PROJEYİ DEPLOY EDİN (5 dakika)

### 5.1 Proje Klasörüne Gidin
Komut satırında proje klasörüne gidin:
```bash
cd C:\Users\YourName\Downloads\tonmining-main
```
(Kendi klasör yolunuzu yazın)

### 5.2 İlk Deploy
```bash
vercel
```

Sorulara şu şekilde cevap verin:
- "Set up and deploy?" → **Y** (Enter)
- "Which scope?" → Hesabınızı seçin (Enter)
- "Link to existing project?" → **N** (Enter)
- "What's your project's name?" → **ton-pro-miner** (ya da istediğiniz isim)
- "In which directory is your code located?" → **./** (Enter)

Bekleyin... Deploy olacak.

### 5.3 Production'a Deploy
```bash
vercel --prod
```

Bekleyin... Production'a deploy olacak.

Size bir URL verecek, örneğin:
```
https://ton-pro-miner.vercel.app
```

✅ **Siteniz yayında!**

---

## ADIM 6: ENVIRONMENT VARIABLES EKLEYIN (2 dakika)

### 6.1 Vercel Dashboard'a Gidin
1. https://vercel.com/dashboard adresine gidin
2. Projenizi bulun (ton-pro-miner)
3. Tıklayın

### 6.2 Settings → Environment Variables
1. Üstteki menüden "Settings" e tıklayın
2. Soldaki menüden "Environment Variables" a tıklayın

### 6.3 Bot Token'ı Ekleyin
1. "Add New" butonuna tıklayın
2. **Key**: `TELEGRAM_BOT_TOKEN`
3. **Value**: Bot token'ınızı yapıştırın (1234567:ABC...)
4. Environment: **Production, Preview, Development** (hepsini seçin)
5. "Save" e tıklayın

### 6.4 Redeploy Yapın
1. Üstteki menüden "Deployments" e tıklayın
2. En üstteki deployment'ın sağındaki 3 noktaya tıklayın
3. "Redeploy" seçin
4. "Redeploy" butonuna basın

Bekleyin... Yeniden deploy olacak.

✅ **Environment variables eklendi!**

---

## ADIM 7: TESTİNİ YAPIN (2 dakika)

### 7.1 Uygulamanızı Açın
Vercel'in size verdiği URL'i tarayıcıda açın:
```
https://ton-pro-miner.vercel.app
```

### 7.2 Telegram Bot'a Başlat
1. Telegram'da kendi botunuzu bulun (@tonprominer_bot)
2. "START" butonuna basın
3. `/start` komutunu gönderin

### 7.3 Bildirimleri Test Edin
1. Uygulamada sağ üstteki 🔔 bildirim ikonuna tıklayın
2. "Enable Telegram Notifications" toggle'ını AÇIN
3. "Test Telegram" butonuna tıklayın
4. Telegram'da bildirimi kontrol edin

### 7.4 Browser Bildirimlerini Test Edin
1. "Enable Browser Notifications" toggle'ını açın
2. Tarayıcı izin isteyecek → "İzin Ver" e tıklayın
3. "Test Browser" butonuna tıklayın
4. Bildirim geldi mi kontrol edin

✅ **Tüm sistem çalışıyor!**

---

## ADIM 8: TELEGRAM CHANNEL'INIZI BAĞLAYIN (1 dakika)

### 8.1 index.html'i Düzenleyin
1. Proje klasöründe `index.html` dosyasını açın
2. CTRL+F ile şunu bulun:
```html
https://t.me/YOUR_CHANNEL_USERNAME
```
3. `YOUR_CHANNEL_USERNAME` yerine kendi kanal adınızı yazın
4. Kaydedin

### 8.2 Yeniden Deploy Edin
```bash
vercel --prod
```

✅ **Telegram kanalınız bağlandı!**

---

## 🎉 TAMAMLANDI!

### ✅ Başardığınız Şeyler:
- ✅ Telegram botu oluşturdunuz
- ✅ Projeyi Vercel'e deploy ettiniz
- ✅ Bildirim sistemi çalışıyor
- ✅ Telegram + Browser bildirimleri aktif
- ✅ Uygulamanız canlı!

### 📱 Artık Yapabilecekleriniz:
- Mining yapabilirsiniz
- Cihaz satın alabilirsiniz
- Referral sistemi kullanabilirsiniz
- Bildirimleri özelleştirebilirsiniz
- Leaderboard'da yarışabilirsiniz

---

## 🆘 SORUN ÇÖZME

### Telegram Bildirimleri Gelmiyor?
1. Bot'a `/start` gönderdiniz mi?
2. Vercel'de TELEGRAM_BOT_TOKEN eklediniz mi?
3. Bot token doğru mu?
4. "Enable Telegram Notifications" açık mı?

### Browser Bildirimleri Gelmiyor?
1. Site HTTPS mi? (Vercel otomatik HTTPS verir)
2. Tarayıcıdan izin verdiniz mi?
3. "Enable Browser Notifications" açık mı?

### Deploy Olmuyor?
```bash
# Debug mode ile deneyin
vercel --debug
```

### Site Açılmıyor?
1. Deploy tamamlandı mı kontrol edin
2. Vercel dashboard'dan "Visit" e tıklayın
3. 2-3 dakika bekleyip tekrar deneyin

---

## 📞 DESTEK

Hala sorun mu var?
1. README.md dosyasını okuyun
2. NOTIFICATION_SETUP.md'ye bakın
3. Vercel logs kontrol edin: `vercel logs`

---

## 🎁 BONUS: OTOMATİK KURULUM

Daha hızlı yapmak isterseniz:
```bash
cd tonmining-main
bash install.sh
```

Script size rehberlik edecek!

---

**🎉 Başarılar! Artık kendi TON madencilik oyununuz var!**
