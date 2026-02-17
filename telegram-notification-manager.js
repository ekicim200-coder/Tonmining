// Telegram Bildirim Yöneticisi
// Frontend'de kullanılacak

class TelegramNotificationManager {
  constructor() {
    this.apiUrl = '/api/telegram-notifications';
    this.chatId = null;
    this.isSubscribed = false;
    this.init();
  }

  // Telegram Web App'ten Chat ID al
  init() {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        this.chatId = tg.initDataUnsafe.user.id;
        this.checkSubscription();
      }
    }
  }

  // Kullanıcının abone olup olmadığını kontrol et
  async checkSubscription() {
    if (!this.chatId) return false;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkSubscription',
          chatId: this.chatId
        })
      });

      const data = await response.json();
      this.isSubscribed = data.subscribed;
      return this.isSubscribed;
    } catch (error) {
      console.error('Subscription check failed:', error);
      return false;
    }
  }

  // Kullanıcıyı bildirimlere abone et
  async subscribe() {
    if (!this.chatId) {
      throw new Error('Chat ID not available');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          chatId: this.chatId
        })
      });

      const data = await response.json();
      if (data.success) {
        this.isSubscribed = true;
      }
      return data;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }

  // Bildirim gönder
  async send(message, type = 'info') {
    if (!this.chatId) {
      throw new Error('Chat ID not available');
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          chatId: this.chatId,
          message: message,
          notificationType: type
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Notification send failed:', error);
      throw error;
    }
  }

  // Hazır bildirim şablonları
  notifications = {
    // Mining bildirimleri
    miningStarted: (deviceName) => 
      this.send(`Mining started on ${deviceName}! 🎯`, 'mining'),
    
    miningStopped: (deviceName) => 
      this.send(`Mining stopped on ${deviceName}`, 'warning'),
    
    // Ödül bildirimleri
    rewardEarned: (amount) => 
      this.send(`You earned ${amount} TON! 🎉`, 'reward'),
    
    dailyReward: (amount) => 
      this.send(`Daily reward: ${amount} TON has been added to your balance! 💰`, 'success'),
    
    // Satın alma bildirimleri
    purchaseSuccess: (itemName, price) => 
      this.send(`Successfully purchased ${itemName} for ${price} TON! ✅`, 'success'),
    
    // Çekim bildirimleri
    withdrawalPending: (amount) => 
      this.send(`Withdrawal of ${amount} TON is being processed... ⏳`, 'info'),
    
    withdrawalSuccess: (amount) => 
      this.send(`Withdrawal of ${amount} TON completed successfully! 💸`, 'success'),
    
    withdrawalFailed: (reason) => 
      this.send(`Withdrawal failed: ${reason}`, 'error'),
    
    // Referral bildirimleri
    newReferral: (username) => 
      this.send(`New referral: ${username} joined using your code! 🎊`, 'reward'),
    
    referralEarning: (amount, from) => 
      this.send(`Earned ${amount} TON from ${from}'s purchase! 💵`, 'reward'),
    
    // Sistem bildirimleri
    maintenanceWarning: (time) => 
      this.send(`⚠️ Scheduled maintenance in ${time}. Mining will pause temporarily.`, 'warning'),
    
    newFeature: (feature) => 
      this.send(`🆕 New feature available: ${feature}`, 'info'),
    
    priceChange: (item, oldPrice, newPrice) => 
      this.send(`Price update: ${item} now ${newPrice} TON (was ${oldPrice} TON)`, 'info')
  };

  // Toplu bildirim gönderme izni kontrolü
  canBroadcast() {
    // Admin kontrolü yapılmalı
    return false;
  }
}

// Global instance oluştur
window.telegramNotifications = new TelegramNotificationManager();

// Kullanım örnekleri:
/*
// Basit bildirim
await window.telegramNotifications.send('Hello from TON Miner!', 'info');

// Hazır şablonlar
await window.telegramNotifications.notifications.rewardEarned('5.5');
await window.telegramNotifications.notifications.purchaseSuccess('GPU Rig Pro', '50');
await window.telegramNotifications.notifications.withdrawalSuccess('100');

// Abonelik kontrolü
const isSubscribed = await window.telegramNotifications.checkSubscription();
if (!isSubscribed) {
  await window.telegramNotifications.subscribe();
}
*/
