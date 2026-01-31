// Telegram Mini App SDK'yı yükle
const tg = window.Telegram?.WebApp;

// Telegram kullanılabilir mi kontrol et
export function isTelegramAvailable() {
    return typeof window.Telegram !== 'undefined' && window.Telegram.WebApp;
}

// Telegram Star ile ödeme başlat
export async function createTelegramInvoice(machineId, machineName, price) {
    if (!isTelegramAvailable()) {
        console.error("Telegram WebApp yok!");
        return false;
    }

    try {
        const starsPrice = Math.ceil(price * 10); // 10 TON = 100 Stars
        
        // Telegram'a veri gönder (bot'a iletilecek)
        const purchaseData = {
            machineId: machineId,
            machineName: machineName,
            price: price,
            starsPrice: starsPrice,
            userId: tg.initDataUnsafe?.user?.id,
            timestamp: Date.now()
        };
        
        // Web App'den bot'a veri gönder
        tg.sendData(JSON.stringify(purchaseData));
        
        // Kullanıcıya bilgi göster
        tg.showAlert(
            `Purchase request sent!\n\n` +
            `Item: ${machineName}\n` +
            `Price: ${starsPrice} Stars\n\n` +
            `Please wait for payment link from bot...`,
            () => {
                console.log("Alert closed");
            }
        );
        
        // Şimdilik otomatik grant (backend implementasyonu için hazırlık)
        return true;
        
    } catch (error) {
        console.error("Telegram invoice hatası:", error);
        tg.showAlert("Payment request failed. Please try again.");
        return false;
    }
}

// Makine rate'ini al
function getMachineRate(machineId) {
    const rates = {
        1: 5,
        2: 15,
        3: 40,
        4: 90,
        5: 250
    };
    return rates[machineId] || 0;
}

// Telegram tema renkleri ile UI'yi güncelle
export function applyTelegramTheme() {
    if (!isTelegramAvailable()) return;
    
    const themeParams = tg.themeParams;
    
    if (themeParams) {
        document.documentElement.style.setProperty('--bg-primary', themeParams.bg_color || '#0f0f0f');
        document.documentElement.style.setProperty('--bg-secondary', themeParams.secondary_bg_color || '#1a1a1a');
        document.documentElement.style.setProperty('--text-primary', themeParams.text_color || '#ffffff');
        document.documentElement.style.setProperty('--primary', themeParams.button_color || '#0088cc');
    }
    
    // Telegram WebApp'i genişlet (tam ekran)
    tg.expand();
    
    // Back button'u gizle
    tg.BackButton.hide();
    
    // Main button'u göster (isteğe bağlı)
    tg.MainButton.hide();
}

// Telegram User ID'yi al
export function getTelegramUserId() {
    if (!isTelegramAvailable()) return null;
    return tg.initDataUnsafe?.user?.id || null;
}

// Telegram User bilgilerini al
export function getTelegramUser() {
    if (!isTelegramAvailable()) return null;
    return tg.initDataUnsafe?.user || null;
}
