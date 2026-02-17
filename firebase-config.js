// Browser Push Notification Sistemi
// Web tarayıcısı bildirimleri için

class BrowserNotificationManager {
  constructor() {
    this.permission = 'default';
    this.isSupported = 'Notification' in window;
    this.init();
  }

  // Başlangıç
  init() {
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  // Bildirim izni iste
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Browser notifications are not supported');
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Bildirim gönder
  async send(title, options = {}) {
    // İzin kontrolü
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('Notification permission denied');
      }
    }

    const defaultOptions = {
      icon: '/icon-192.png', // App icon'unuzu buraya ekleyin
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Bildirime tıklandığında
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // URL varsa oraya yönlendir
        if (options.url) {
          window.location.href = options.url;
        }
      };

      return notification;
    } catch (error) {
      console.error('Notification failed:', error);
      throw error;
    }
  }

  // Hazır bildirim şablonları
  notifications = {
    // Mining bildirimleri
    miningStarted: (deviceName) => 
      this.send('⛏️ Mining Started', {
        body: `${deviceName} is now mining TON!`,
        tag: 'mining-start',
        icon: '/mining-icon.png'
      }),

    hashRateUpdate: (hashRate) => 
      this.send('📊 Hash Rate Update', {
        body: `Current: ${hashRate} GH/s`,
        tag: 'hashrate',
        requireInteraction: false
      }),

    // Ödül bildirimleri
    rewardEarned: (amount) => 
      this.send('🎉 Reward Earned!', {
        body: `You earned ${amount} TON`,
        tag: 'reward',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300]
      }),

    dailyBonus: (amount) => 
      this.send('💰 Daily Bonus Available!', {
        body: `Claim your ${amount} TON daily bonus`,
        tag: 'daily-bonus',
        requireInteraction: true
      }),

    // Çekim bildirimleri
    withdrawalComplete: (amount) => 
      this.send('✅ Withdrawal Complete', {
        body: `${amount} TON sent to your wallet`,
        tag: 'withdrawal',
        requireInteraction: true
      }),

    withdrawalPending: (amount) => 
      this.send('⏳ Processing Withdrawal', {
        body: `${amount} TON withdrawal in progress...`,
        tag: 'withdrawal-pending'
      }),

    // Satın alma bildirimleri
    purchaseSuccess: (item, price) => 
      this.send('✅ Purchase Successful', {
        body: `${item} purchased for ${price} TON`,
        tag: 'purchase'
      }),

    // Referral bildirimleri
    newReferral: (username) => 
      this.send('👥 New Referral!', {
        body: `${username} joined using your code`,
        tag: 'referral'
      }),

    referralBonus: (amount) => 
      this.send('💵 Referral Bonus', {
        body: `Earned ${amount} TON from referral`,
        tag: 'referral-bonus',
        requireInteraction: true
      }),

    // Sistem bildirimleri
    systemMaintenance: (time) => 
      this.send('⚠️ Maintenance Notice', {
        body: `System maintenance in ${time}`,
        tag: 'maintenance',
        requireInteraction: true
      }),

    deviceOffline: (deviceName) => 
      this.send('🔴 Device Offline', {
        body: `${deviceName} stopped responding`,
        tag: 'device-offline',
        requireInteraction: true,
        vibrate: [500, 200, 500]
      }),

    // Özel kampanyalar
    specialOffer: (title, description) => 
      this.send(`🎁 ${title}`, {
        body: description,
        tag: 'special-offer',
        requireInteraction: true,
        vibrate: [300, 100, 300]
      })
  };

  // İzin durumunu kontrol et
  hasPermission() {
    return this.permission === 'granted';
  }

  // Desteklenip desteklenmediğini kontrol et
  isSupported() {
    return this.isSupported;
  }
}

// Global instance oluştur
window.browserNotifications = new BrowserNotificationManager();

// Service Worker ile arka plan bildirimleri (optional)
class ServiceWorkerNotifications {
  constructor() {
    this.registration = null;
    this.init();
  }

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Arka plan bildirimi gönder
  async sendBackgroundNotification(title, options) {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        ...options
      });
    } catch (error) {
      console.error('Background notification failed:', error);
      throw error;
    }
  }
}

window.swNotifications = new ServiceWorkerNotifications();

// Kullanım örnekleri:
/*
// İzin iste
await window.browserNotifications.requestPermission();

// Basit bildirim
await window.browserNotifications.send('Hello!', {
  body: 'This is a test notification',
  icon: '/icon.png'
});

// Hazır şablonlar
await window.browserNotifications.notifications.rewardEarned('5.5');
await window.browserNotifications.notifications.purchaseSuccess('GPU Rig', '50');
await window.browserNotifications.notifications.dailyBonus('10');

// İzin kontrolü
if (window.browserNotifications.hasPermission()) {
  console.log('Notifications enabled');
}
*/
