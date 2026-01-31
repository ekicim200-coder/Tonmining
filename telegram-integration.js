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
        const userId = tg.initDataUnsafe?.user?.id;
        if (!userId) {
            tg.showAlert("User ID not found. Please restart the app.");
            return false;
        }

        // Backend'den invoice URL al
        const response = await fetch('/api/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                machineId,
                machineName,
                price,
                userId
            })
        });

        const data = await response.json();

        if (!data.success || !data.invoiceUrl) {
            console.error('Invoice creation failed:', data);
            tg.showAlert("Failed to create payment link. Please try again.");
            return false;
        }

        // Invoice URL ile ödeme ekranını aç
        return new Promise((resolve) => {
            tg.openInvoice(data.invoiceUrl, (status) => {
                if (status === 'paid') {
                    console.log("✅ Telegram Stars ödeme başarılı!");
                    tg.showAlert("Payment successful! Your machine will be added shortly.");
                    resolve(true);
                } else if (status === 'cancelled') {
                    console.log("❌ Ödeme iptal edildi");
                    resolve(false);
                } else if (status === 'failed') {
                    console.log("❌ Ödeme başarısız");
                    tg.showAlert("Payment failed. Please try again.");
                    resolve(false);
                }
            });
        });
        
    } catch (error) {
        console.error("Telegram invoice hatası:", error);
        tg.showAlert("An error occurred. Please try again.");
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
