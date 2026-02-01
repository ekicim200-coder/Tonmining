# TON Mining - Telegram Stars Ödeme Entegrasyonu

Bu proje artık **Telegram Stars** ile ödeme özelliğini destekliyor! Kullanıcılar mining makinelerini hem **TON** hem de **Telegram Stars** ile satın alabilir.

## 🆕 Yenilikler

### Market Bölümü Güncellemeleri

Her mining makinesinin artık **2 farklı ödeme seçeneği** var:

1. **TON ile Ödeme** - Mavi buton
2. **Telegram Stars ile Ödeme** - Altın sarısı buton (⭐)

### Star Fiyatları

| Makine | TON Fiyatı | Star Fiyatı |
|--------|-----------|------------|
| Starter CPU | 10 TON | ⭐ 50 Stars |
| GTX 1660 | 30 TON | ⭐ 150 Stars |
| RTX 3060 | 75 TON | ⭐ 375 Stars |
| RTX 4090 | 150 TON | ⭐ 750 Stars |
| ASIC Miner | 400 TON | ⭐ 2000 Stars |

## 🔧 Kurulum ve Kullanım

### 1. Frontend Değişiklikleri

Aşağıdaki dosyalar güncellendi:

- ✅ `script.js` - Star ödeme fonksiyonları eklendi
- ✅ `style.css` - Star butonları için yeni stiller
- ✅ `index.html` - Telegram Web App SDK eklendi

### 2. Backend Kurulumu (Zorunlu!)

Telegram Stars ödemelerinin çalışması için bir **backend API** kurmanız gerekiyor.

#### Adım 1: Telegram Bot Oluşturun

1. Telegram'da [@BotFather](https://t.me/BotFather) ile konuşun
2. `/newbot` komutu ile yeni bot oluşturun
3. Bot token'ınızı alın
4. `/setinlinefeedback` ile inline feedback açın

#### Adım 2: Backend API'yi Kurun

```bash
# Node.js Express backend örneği
npm install express node-fetch

# backend-stars-api.js dosyasını backend projenize ekleyin
# Bot token'ınızı dosyaya girin
```

#### Adım 3: API URL'ini Güncelleyin

`script.js` dosyasında `createStarsInvoice` fonksiyonundaki URL'i değiştirin:

```javascript
const response = await fetch('YOUR_BACKEND_API/create-invoice', {
    // Backend API URL'inizi buraya yazın
    // Örnek: https://yourapi.com/create-invoice
```

#### Adım 4: Webhook Kurun

```bash
# Telegram webhook'u backend'inize yönlendirin
curl -F "url=https://yourbackend.com/webhook" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### 3. Telegram Mini App Olarak Yayınlama

Projenizi Telegram Mini App olarak yayınlamak için:

1. Projeyi bir web sunucusuna deploy edin (Vercel, Netlify, vb.)
2. BotFather'da `/newapp` komutu ile mini app oluşturun
3. Web app URL'inizi verin
4. Kullanıcılar artık Telegram içinden uygulamanıza erişebilir

## 🎮 Nasıl Çalışır?

1. Kullanıcı market bölümünde bir makine görür
2. İki seçenek sunar: TON veya Stars
3. Stars butonuna tıklarsa:
   - Telegram Web App API kontrolü yapılır
   - Backend'e invoice oluşturma isteği gönderilir
   - Telegram ödeme penceresi açılır
   - Kullanıcı Stars ile ödeme yapar
   - Webhook ile ödeme onaylanır
   - Makine kullanıcıya otomatik verilir

## ⚠️ Önemli Notlar

1. **Telegram Web App SDK** gereklidir - Normal browser'da çalışmaz
2. **Backend API** olmadan Stars ödemesi ÇALIŞMAZ
3. Bot'unuzun **Stars ödemelerini** kabul etmesi için Telegram'dan onay almalısınız
4. Test için Telegram'ın test ortamını kullanabilirsiniz

## 🔐 Güvenlik

- Bot token'ınızı asla frontend'de tutmayın
- Tüm ödeme validasyonlarını backend'de yapın
- Webhook signature'ları kontrol edin
- Firebase rules'larınızı düzenleyin

## 📱 Test Etme

1. Telegram'da bot'unuzu başlatın
2. Mini App'i açın
3. Wallet bağlayın
4. Market'e gidin
5. Bir makine seçin ve ⭐ Stars butonuna tıklayın
6. Ödeme penceresinde ödemeyi tamamlayın

## 🐛 Sorun Giderme

**"Bu özellik sadece Telegram içinde çalışır" hatası:**
- Uygulamayı Telegram Mini App olarak açmanız gerekiyor

**"Star ödemesi başarısız" hatası:**
- Backend API URL'inizi kontrol edin
- Bot token'ınızı kontrol edin
- Webhook'un doğru çalıştığından emin olun

**Invoice oluşturulamıyor:**
- Bot'unuzun Stars ödemelerini kabul edip etmediğini kontrol edin
- Telegram API limitlerini kontrol edin

## 📚 Kaynaklar

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Stars Documentation](https://core.telegram.org/bots/payments)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)

## 💡 İpuçları

- Star fiyatlarını TON fiyatına göre ayarlayın
- Kullanıcılara her iki ödeme yöntemini de sunun
- Ödeme geçmişi tutun
- Başarılı ödemeleri Firebase'e loglayin

---

**Not:** Bu entegrasyon için backend gereklidir. Backend olmadan sadece TON ödemesi çalışır.
