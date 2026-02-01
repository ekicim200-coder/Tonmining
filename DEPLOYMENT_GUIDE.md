# 🚀 Tonmining - Deployment Kılavuzu

## ✅ HAZIR! Projeniz deploy edilmeye hazır.

Tüm dosyalar düzeltildi ve production-ready durumda. Aşağıdaki adımları takip edin:

---

## 📦 ADIM 1: GitHub'a Yükleme (Zaten Yaptınız ✓)

Projeniz zaten GitHub'da: `ekcicim200-coder/Tonmining`

---

## 🚀 ADIM 2: Vercel'e Deploy

### 2.1 Yeni Deploy
1. [vercel.com/new](https://vercel.com/new) adresine gidin
2. GitHub repo'nuzu seçin: **Tonmining**
3. Ayarları kontrol edin:
   - **Framework Preset**: Other
   - **Root Directory**: `.` (boş bırakın)
   - **Build Command**: Boş bırakın
   - **Output Directory**: Boş bırakın
4. **Deploy** butonuna tıklayın

### 2.2 Önemli Not
İlk deploy'da 404 hatası almanız normal! Environment variables ekleyip redeploy yapacağız.

---

## 🔐 ADIM 3: Environment Variables

Deploy tamamlandıktan sonra:

1. Vercel Dashboard → Projeniz → **Settings**
2. Sol menüden **Environment Variables**
3. Şu değişkeni ekleyin:

```
Name:  TELEGRAM_BOT_TOKEN
Value: 7886677744:AAE... (BotFather'dan aldığınız token)
```

4. **Production**, **Preview**, ve **Development** seçeneklerini işaretleyin
5. **Save** butonuna tıklayın

---

## 🔄 ADIM 4: Redeploy

Environment variables ekledikten sonra:

1. **Deployments** sekmesine gidin
2. En son deployment'ın yanındaki **3 nokta (⋯)** menüsüne tıklayın
3. **Redeploy** seçin
4. **Redeploy** butonuna tıklayın

Deploy tamamlandığında siteniz çalışır olacak! 🎉

---

## 🤖 ADIM 5: Telegram Bot Webhook Kurulumu

Deploy tamamlandıktan sonra webhook'u ayarlayın.

### 5.1 Deployment URL'inizi Alın
Vercel Dashboard'dan deployment URL'inizi kopyalayın:
```
https://tonmining.vercel.app (örnek)
```

### 5.2 Webhook Komutunu Çalıştırın

**Windows CMD / PowerShell:**
```bash
curl -F "url=https://tonmining.vercel.app/api/webhook" https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

**Linux / Mac Terminal:**
```bash
curl -F "url=https://tonmining.vercel.app/api/webhook" \
  https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

**<BOT_TOKEN>** yerine BotFather'dan aldığınız token'ı yazın.

### 5.3 Webhook Doğrulama

```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Başarılı yanıt:
```json
{
  "ok": true,
  "result": {
    "url": "https://tonmining.vercel.app/api/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 🎮 ADIM 6: Test Etme

### 6.1 Telegram Mini App Olarak Açın
1. Telegram'da bot'unuzu açın: `@your_bot`
2. `/start` komutu gönderin
3. Mini App butonuna tıklayın
4. Uygulama açılmalı ✅

### 6.2 Temel Testler

**Test 1: Sayfa Açılıyor mu?**
- ✅ Index.html yüklendi
- ✅ Dashboard görünüyor
- ✅ Wallet Connect butonu var

**Test 2: Wallet Bağlama**
- Connect Wallet → TON Connect açılmalı
- Wallet bağlayın
- Balance senkronize olmalı

**Test 3: Star Ödemesi**
- Market sekmesine gidin
- Bir makine seçin
- **⭐ Stars** butonuna tıklayın
- Telegram ödeme penceresi açılmalı

**Test 4: Webhook Çalışıyor mu?**
- Test ödemesi yapın
- Vercel Logs'da şunu görmelisiniz:
  ```
  📨 Webhook alındı: {...}
  ✅ Pre-checkout onaylanıyor...
  💰 Ödeme başarılı!
  ```

---

## 🔍 Sorun Giderme

### Hata: 404 Not Found
**Sebep:** Environment variables eklenmemiş veya redeploy yapılmamış.
**Çözüm:** Adım 3 ve 4'ü tekrar yapın.

### Hata: "Invoice oluşturulamadı"
**Sebep:** Bot token yanlış veya eksik.
**Çözüm:** 
1. Vercel → Settings → Environment Variables
2. `TELEGRAM_BOT_TOKEN` değerini kontrol edin
3. Redeploy yapın

### Hata: Webhook çalışmıyor
**Sebep:** Webhook URL yanlış veya silinmiş.
**Çözüm:** Adım 5'i tekrar yapın.

### Hata: "Bu özellik sadece Telegram içinde çalışır"
**Sebep:** Uygulama normal tarayıcıda açılmış.
**Çözüm:** Telegram Mini App olarak açın.

---

## 📊 Vercel Logs Kontrol

Hataları görmek için:

1. Vercel Dashboard → **Logs** sekmesi
2. Real-time logları görün
3. Webhook çağrılarını takip edin

Veya terminal'den:
```bash
vercel logs --follow
```

---

## 🎯 Tamamlandı!

Artık projeniz tamamen hazır ve çalışır durumda! 🚀

### Yapılan Değişiklikler:
- ✅ API URL otomatik olarak Vercel URL'ini kullanıyor
- ✅ Package.json düzenlendi
- ✅ Error handling iyileştirildi
- ✅ .vercelignore eklendi
- ✅ Fonksiyonlar korundu, hiçbir özellik bozulmadı

### Next Steps:
- 🔐 Firebase Security Rules ayarlayın
- 📊 Google Analytics ekleyin
- 🎨 Custom domain bağlayın (opsiyonel)

---

**Sorularınız için:** Vercel logs veya GitHub Issues kullanabilirsiniz.

**Son Güncelleme:** 01 Şubat 2026
