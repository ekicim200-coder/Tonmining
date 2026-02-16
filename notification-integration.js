// Notification System Integration
// Script.js'e eklenecek fonksiyonlar

// Sayfa yüklendiğinde notification sistemini başlat
document.addEventListener('DOMContentLoaded', async () => {
    await initNotificationSystem();
});

// Notification sistemini başlat
async function initNotificationSystem() {
    try {
        // Telegram WebApp user ID'sini al
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const userId = tg.initDataUnsafe.user.id.toString();
                const chatId = userId;
                
                // Firebase'den kullanıcının notification tercihlerini al
                const preferences = await getNotificationPreferences(userId);
                
                // Telegram notification manager'ı yapılandır
                if (preferences.telegram?.enabled && preferences.telegram?.chatId) {
                    window.telegramNotifications.chatId = preferences.telegram.chatId;
                    window.telegramNotifications.isSubscribed = true;
                }
                
                // Browser notification durumunu kontrol et
                if (preferences.browser?.enabled) {
                    await window.browserNotifications.requestPermission();
                }
                
                // Okunmamış bildirim sayısını güncelle
                await updateNotificationBadge(userId);
            }
        }
    } catch (error) {
        console.error('Notification system initialization failed:', error);
    }
}

// Bildirim badge'ini güncelle
async function updateNotificationBadge(userId) {
    try {
        const unreadCount = await getUnreadNotificationCount(userId);
        const badge = document.getElementById('notif-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to update notification badge:', error);
    }
}

// Mining başladığında bildirim gönder
async function notifyMiningStarted(deviceName, userId) {
    try {
        // Telegram bildirimi
        await window.telegramNotifications.notifications.miningStarted(deviceName);
        
        // Browser bildirimi
        await window.browserNotifications.notifications.miningStarted(deviceName);
        
        // Firebase'e kaydet
        await saveNotificationHistory(userId, {
            type: 'mining',
            title: 'Mining Started',
            message: `${deviceName} is now mining!`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Mining started notification failed:', error);
    }
}

// Ödül kazanıldığında bildirim gönder
async function notifyRewardEarned(amount, userId) {
    try {
        // Telegram bildirimi
        await window.telegramNotifications.notifications.rewardEarned(amount);
        
        // Browser bildirimi
        await window.browserNotifications.notifications.rewardEarned(amount);
        
        // Firebase'e kaydet
        await saveNotificationHistory(userId, {
            type: 'reward',
            title: 'Reward Earned',
            message: `You earned ${amount} TON!`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Reward notification failed:', error);
    }
}

// Satın alma tamamlandığında bildirim gönder
async function notifyPurchaseComplete(itemName, price, userId) {
    try {
        // Telegram bildirimi
        await window.telegramNotifications.notifications.purchaseSuccess(itemName, price);
        
        // Browser bildirimi
        await window.browserNotifications.notifications.purchaseSuccess(itemName, price);
        
        // Firebase'e kaydet
        await saveNotificationHistory(userId, {
            type: 'purchase',
            title: 'Purchase Successful',
            message: `${itemName} purchased for ${price} TON`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Purchase notification failed:', error);
    }
}

// Çekim durumu bildirimi
async function notifyWithdrawal(amount, status, userId) {
    try {
        if (status === 'pending') {
            await window.telegramNotifications.notifications.withdrawalPending(amount);
            await window.browserNotifications.notifications.withdrawalPending(amount);
        } else if (status === 'complete') {
            await window.telegramNotifications.notifications.withdrawalSuccess(amount);
            await window.browserNotifications.notifications.withdrawalComplete(amount);
        }
        
        await saveNotificationHistory(userId, {
            type: 'withdrawal',
            title: status === 'complete' ? 'Withdrawal Complete' : 'Withdrawal Processing',
            message: `${amount} TON ${status === 'complete' ? 'sent to your wallet' : 'is being processed'}`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Withdrawal notification failed:', error);
    }
}

// Referral bildirimi
async function notifyNewReferral(username, userId) {
    try {
        await window.telegramNotifications.notifications.newReferral(username);
        await window.browserNotifications.notifications.newReferral(username);
        
        await saveNotificationHistory(userId, {
            type: 'referral',
            title: 'New Referral',
            message: `${username} joined using your code!`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Referral notification failed:', error);
    }
}

// Günlük bonus bildirimi
async function notifyDailyBonus(amount, userId) {
    try {
        await window.telegramNotifications.notifications.dailyReward(amount);
        await window.browserNotifications.notifications.dailyBonus(amount);
        
        await saveNotificationHistory(userId, {
            type: 'daily',
            title: 'Daily Bonus Available',
            message: `Claim your ${amount} TON daily bonus!`,
            channel: 'both'
        });
        
        await updateNotificationBadge(userId);
    } catch (error) {
        console.error('Daily bonus notification failed:', error);
    }
}

// Sistem bakım bildirimi (Admin)
async function notifySystemMaintenance(time) {
    try {
        // Tüm aktif kullanıcılara bildirim gönder
        const users = await getUsersForNotification('system');
        
        for (const user of users) {
            if (user.chatId) {
                await window.telegramNotifications.send(
                    `⚠️ Scheduled maintenance in ${time}. Mining will pause temporarily.`,
                    'warning'
                );
            }
        }
        
        // Browser bildirimi
        await window.browserNotifications.notifications.systemMaintenance(time);
    } catch (error) {
        console.error('System maintenance notification failed:', error);
    }
}

// Notification tercihlerini kaydet
async function saveUserNotificationPreferences(userId, preferences) {
    try {
        // Telegram chat ID'yi güncelle
        if (preferences.telegramEnabled && window.telegramNotifications.chatId) {
            preferences.telegramChatId = window.telegramNotifications.chatId;
        }
        
        // Firebase'e kaydet
        const result = await saveNotificationPreferences(userId, preferences);
        
        if (result.success) {
            showToast('Notification preferences saved!', 'success');
        } else {
            showToast('Failed to save preferences', 'error');
        }
        
        return result;
    } catch (error) {
        console.error('Failed to save notification preferences:', error);
        showToast('Failed to save preferences', 'error');
        return { success: false, error: error.message };
    }
}

// Toast mesajı göster
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        
        if (type === 'success') {
            toast.style.borderColor = 'var(--success)';
            toast.style.color = 'var(--success)';
        } else if (type === 'error') {
            toast.style.borderColor = 'var(--danger)';
            toast.style.color = 'var(--danger)';
        } else {
            toast.style.borderColor = 'var(--primary)';
            toast.style.color = 'var(--primary)';
        }
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Export fonksiyonlar (script.js'de kullanılmak üzere)
window.notificationSystem = {
    init: initNotificationSystem,
    updateBadge: updateNotificationBadge,
    notifyMiningStarted,
    notifyRewardEarned,
    notifyPurchaseComplete,
    notifyWithdrawal,
    notifyNewReferral,
    notifyDailyBonus,
    notifySystemMaintenance,
    savePreferences: saveUserNotificationPreferences
};
