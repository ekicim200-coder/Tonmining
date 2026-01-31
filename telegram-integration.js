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
        // Telegram Star fiyatı (1 Star = belirlediğiniz değer)
        // Örnek: 10 TON = 100 Stars
        const starsPrice = Math.ceil(price * 10); // 10 TON = 100 Stars
        
        // Invoice oluştur
        const invoice = {
            title: machineName,
            description: `+${getMachineRate(machineId)} GH/s mining power`,
            payload: JSON.stringify({ 
                machineId: machineId,
                userId: tg.initDataUnsafe?.user?.id 
            }),
            provider_token: "", // Stars için boş
            currency: "XTR", // Telegram Stars currency code
            prices: [{
                label: machineName,
                amount: starsPrice
            }]
        };

        return new Promise((resolve, reject) => {
            tg.openInvoice(invoice, (status) => {
                if (status === 'paid') {
                    console.log("✅ Telegram Stars ödeme başarılı!");
                    resolve(true);
                } else if (status === 'cancelled') {
                    console.log("❌ Ödeme iptal edildi");
                    resolve(false);
                } else if (status === 'failed') {
                    console.log("❌ Ödeme başarısız");
                    reject(new Error('Payment failed'));
                }
            });
        });
    } catch (error) {
        console.error("Telegram invoice hatası:", error);
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
