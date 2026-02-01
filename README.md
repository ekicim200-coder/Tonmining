# Telegram Stars Backend - Kurulum Rehberi

Bu backend, TON Mining projeniz için Telegram Stars ödemelerini yönetir.

## 🚀 Hızlı Kurulum (Vercel)

### Adım 1: GitHub'a Yükle

```bash
# Proje klasörüne git
cd telegram-stars-backend

# Git başlat
git init
git add .
git commit -m "Initial commit"

# GitHub'da yeni repo oluştur ve bağla
git remote add origin https://github.com/KULLANICI_ADIN/tonmining-backend.git
git push -u origin main
```

### Adım 2: Vercel'e Deploy Et

1. **Vercel.com**'a git ve GitHub ile giriş yap
2. **"Add New Project"** butonuna tıkla
3. GitHub repo'nu seç: `tonmining-backend`
4. **"Import"** butonuna tıkla
5. **Environment Variables** bölümüne:
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: `SENIN_BOT_TOKEN_IN` (BotFather'dan aldığın)
6. **"Deploy"** butonuna tıkla

### Adım 3: Webhook Kur

Deploy bittikten sonra, Vercel sana bir URL verecek. Örnek:
```
https://tonmining-backend.vercel.app
```

Bu URL'i kullanarak Telegram webhook'u kur:

```bash
curl -X POST "https://api.telegram.org/botSENIN_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://tonmining-backend.vercel.app/api/webhook"}'
```

**ÖNEMLİ:** `SENIN_BOT_TOKEN` yerine gerçek token'ını yaz!

### Adım 4: Frontend'i Güncelle

`script.js` dosyasında `createStarsInvoice` fonksiyonunu güncelle:

```javascript
async function createStarsInvoice(machineId, starAmount) {
    const response = await fetch('https://tonmining-backend.vercel.app/api/create-invoice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            machineId: machineId,
            amount: starAmount,
            userId: currentUserUid,
            wallet: state.wallet
        })
    });
    
    const data = await response.json();
    if (data.success) {
        return data.invoiceLink;
    } else {
        throw new Error(data.error);
    }
}
```

## 🧪 Test Et

1. Telegram'da bot'unu başlat
2. Mini App'i aç (veya web sayfanda test et)
3. Market'ten bir makine seç
4. ⭐ Stars butonuna tıkla
5. Ödeme penceresinde test et

## 🔍 Sorun Giderme

### Webhook kontrol et:
```bash
curl "https://api.telegram.org/botSENIN_BOT_TOKEN/getWebhookInfo"
```

### Logları görüntüle:
Vercel Dashboard → Project → Deployments → View Function Logs

### Yaygın Hatalar:

**"Bot token yapılandırılmamış"**
- Vercel'de Environment Variable'ı doğru ekledin mi?
- Variable ismi tam olarak `TELEGRAM_BOT_TOKEN` mi?

**"Invoice oluşturulamadı"**
- Bot token doğru mu?
- Bot'un Stars ödemelerini kabul etmesi için Telegram onayı aldın mı?

**CORS hatası**
- Backend URL'ini doğru yazdın mı?
- Frontend'de `https://` var mı?

## 📝 API Endpoints

### POST /api/create-invoice
Invoice oluşturur.

**Request:**
```json
{
  "machineId": 1,
  "userId": "user123",
  "wallet": "UQC5h1..."
}
```

**Response:**
```json
{
  "success": true,
  "invoiceLink": "https://t.me/$invoice_link"
}
```

### POST /api/webhook
Telegram'dan ödeme bildirimlerini alır.

## 🔐 Güvenlik

- Bot token'ını ASLA frontend'e koyma
- Environment variables kullan
- Webhook signature kontrol et (production'da)

## 💡 İpuçları

- Test için küçük miktarlarla başla
- Her değişiklikten sonra `git push` yap, Vercel otomatik deploy eder
- Logları sürekli takip et

---

**Hazır!** Artık Telegram Stars ile ödeme alabilirsin! 🎉
