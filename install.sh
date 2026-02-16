#!/bin/bash

# TON Pro Miner - Otomatik Bildirim Sistemi Kurulumu

echo "🚀 TON Pro Miner - Bildirim Sistemi Otomatik Kurulum"
echo "=================================================="
echo ""

# Renk kodları
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Telegram Bot Token Kontrolü
echo -e "${BLUE}📱 Adım 1: Telegram Bot Ayarları${NC}"
echo ""
echo "Telegram Bot oluşturmak için:"
echo "1. Telegram'da @BotFather'ı aç"
echo "2. /newbot komutunu gönder"
echo "3. Bot adını gir (örn: TON Pro Miner Bot)"
echo "4. Username gir (örn: tonprominer_bot)"
echo "5. Verilen token'ı kopyala"
echo ""

# Token input
read -p "Telegram Bot Token'ınızı girin (ya da Enter'a basıp sonra ekleyin): " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Bot token girmediniz. Daha sonra manuel olarak eklemeniz gerekecek.${NC}"
    BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
else
    echo -e "${GREEN}✅ Bot token alındı!${NC}"
fi

# 2. .env dosyası oluştur
echo ""
echo -e "${BLUE}📝 Adım 2: Environment dosyası oluşturuluyor...${NC}"

cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}

# Firebase Configuration (varsa)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

# App Configuration
APP_URL=https://your-app-url.vercel.app
NODE_ENV=production
EOF

echo -e "${GREEN}✅ .env dosyası oluşturuldu!${NC}"

# 3. package.json güncelle
echo ""
echo -e "${BLUE}📦 Adım 3: Dependencies ekleniyor...${NC}"

cat > package.json << 'EOF'
{
  "name": "ton-pro-miner",
  "version": "1.0.0",
  "description": "TON Pro Miner - Telegram Mining Game",
  "main": "index.html",
  "scripts": {
    "dev": "vercel dev",
    "deploy": "vercel --prod"
  },
  "dependencies": {
    "node-fetch": "^2.6.1"
  },
  "engines": {
    "node": ">=14.x"
  }
}
EOF

echo -e "${GREEN}✅ package.json güncellendi!${NC}"

# 4. Vercel config
echo ""
echo -e "${BLUE}⚙️  Adım 4: Vercel yapılandırması...${NC}"

cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "**/*.html",
      "use": "@vercel/static"
    },
    {
      "src": "**/*.js",
      "use": "@vercel/static"
    },
    {
      "src": "**/*.css",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "TELEGRAM_BOT_TOKEN": "@telegram_bot_token"
  }
}
EOF

echo -e "${GREEN}✅ vercel.json yapılandırıldı!${NC}"

# 5. Notification icons oluştur
echo ""
echo -e "${BLUE}🎨 Adım 5: Notification icon'ları oluşturuluyor...${NC}"

mkdir -p public/icons

# SVG icon oluştur (placeholder)
cat > public/icons/notification-icon.svg << 'EOF'
<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="20" fill="#40e0d0"/>
  <text x="96" y="120" font-size="100" text-anchor="middle" fill="white">⛏️</text>
</svg>
EOF

echo -e "${GREEN}✅ Icon'lar hazırlandı!${NC}"

# 6. README oluştur
echo ""
echo -e "${BLUE}📚 Adım 6: Dokümantasyon hazırlanıyor...${NC}"

cat > QUICK_START.md << 'EOF'
# 🚀 TON Pro Miner - Hızlı Başlangıç

## ✅ Kurulum Tamamlandı!

### 📱 Telegram Bot Kurulumu

1. **Bot Token'ınız varsa:**
   - `.env` dosyasını açın
   - `TELEGRAM_BOT_TOKEN` değerini güncelleyin

2. **Bot Token'ınız yoksa:**
   - @BotFather'a gidin
   - `/newbot` komutunu gönderin
   - Token'ı alıp `.env` dosyasına ekleyin

### 🌐 Vercel'e Deploy

```bash
# Vercel CLI yükleyin (ilk kez)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Deploy sırasında Environment Variables ekleyin:
- `TELEGRAM_BOT_TOKEN` = your_bot_token

### 🧪 Test Etme

1. Uygulamanızı açın
2. Header'daki 🔔 ikonuna tıklayın
3. "Enable Telegram Notifications" açın
4. "Test Telegram" butonuna tıklayın

### 📝 Bot Komutları Ayarlama

@BotFather'da:
```
/setcommands

Ardından şunu gönderin:
start - Start receiving notifications
stop - Stop notifications
status - Check notification status
help - Get help
```

### 🎯 Kullanım

```javascript
// Mining başladı bildirimi
await window.telegramNotifications.notifications.miningStarted('GPU Rig Pro');

// Ödül kazanıldı
await window.telegramNotifications.notifications.rewardEarned('5.5');

// Custom bildirim
await window.telegramNotifications.send('Custom message', 'success');
```

### 🔧 Sorun Giderme

**Bildirim gelmiyor?**
1. Bot token doğru mu kontrol edin
2. Kullanıcı bot'a /start gönderdi mi?
3. Vercel env variables ayarlandı mı?

**Deploy hatası?**
```bash
vercel --debug
```

### 📞 Destek

- Dokümantasyon: NOTIFICATION_SETUP.md
- GitHub: your-repo-url

Başarılar! 🎉
EOF

echo -e "${GREEN}✅ QUICK_START.md oluşturuldu!${NC}"

# 7. Git ignore
echo ""
echo -e "${BLUE}🔒 Adım 7: .gitignore oluşturuluyor...${NC}"

cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.production

# Dependencies
node_modules/
package-lock.json
yarn.lock

# Vercel
.vercel

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
EOF

echo -e "${GREEN}✅ .gitignore oluşturuldu!${NC}"

# 8. Özet
echo ""
echo -e "${GREEN}=================================================="
echo "✅ KURULUM TAMAMLANDI!"
echo -e "==================================================${NC}"
echo ""
echo -e "${BLUE}📋 Sonraki Adımlar:${NC}"
echo ""
echo "1. Telegram Bot token'ınızı .env dosyasına ekleyin (eğer henüz eklemediyseniz)"
echo "2. Vercel'e deploy edin:"
echo "   ${YELLOW}vercel --prod${NC}"
echo ""
echo "3. Vercel dashboard'da Environment Variables ekleyin:"
echo "   ${YELLOW}TELEGRAM_BOT_TOKEN = your_bot_token${NC}"
echo ""
echo "4. Bot komutlarını @BotFather'da ayarlayın"
echo ""
echo -e "${BLUE}📚 Dokümantasyon:${NC}"
echo "   - NOTIFICATION_SETUP.md (Detaylı kurulum)"
echo "   - QUICK_START.md (Hızlı başlangıç)"
echo ""
echo -e "${GREEN}🎉 Başarılar!${NC}"
echo ""
