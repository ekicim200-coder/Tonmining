// app.js (TANI MODU)
import { db, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs, where } from './firebase-config.js';

console.log("🚀 TANI MODU BAŞLATILIYOR...");

// --- 1. ID'Yİ SABİTLİYORUZ (Sorun ID mi değil mi emin olmak için) ---
// Test bitince burayı eski haline getirebilirsin.
const userID = "TEST_USER_123"; 
console.log("👤 KULLANICI:", userID);

const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

// --- 2. VARSAYILAN AYARLAR ---
const products = [
    { id: 1, name: "Nano Node",      priceTON: 10,  priceStars: 50,   hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,  hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    // ... Diğer ürünler (kısaltıldı)
];
products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

let gameState = {
    balance: 10.0000000, // Başlangıç bakiyesi
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    lastLogin: Date.now()
};

document.addEventListener('DOMContentLoaded', () => {
    // Önce veriyi yüklemeyi dene
    loadGame(); 
    
    // Arayüzü başlat
    renderMarket();
    showPage('dashboard');
    initChart();
    
    // Çekim butonu
    document.getElementById('btn-withdraw')?.addEventListener('click', processWithdraw);
    
    // Her 10 saniyede bir kaydet (Hızlı test için süreyi kısalttım)
    setInterval(() => { saveGame(false); }, 10000); 
});

// --- 3. KRİTİK BÖLÜM: YÜKLEME ---
async function loadGame() {
    try {
        const userRef = doc(db, "users", userID);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            // VERİ BULUNDU!
            gameState = { ...gameState, ...docSnap.data() };
            alert("✅ BAŞARILI: Kayıtlı oyun bulundu! Bakiye: " + gameState.balance);
            finalizeLoad();
        } else {
            // VERİ YOK!
            alert("⚠️ UYARI: Kayıtlı veri bulunamadı! Yeni oyun (10 Bakiye) başlatılıyor.\n\nSebep: Veritabanına daha önce hiç kayıt yapılamamış.");
            saveGame(true); // İlk kaydı zorla yapalım
        }
    } catch (error) {
        alert("❌ HATA: Veritabanı OKUNAMIYOR!\n" + error.message);
        console.error(error);
    }
}

// --- 4. KRİTİK BÖLÜM: KAYDETME ---
async function saveGame(showIcon = true) {
    const ind = document.getElementById('save-indicator');
    if(showIcon && ind) { ind.style.opacity = '1'; ind.innerText = "Saving..."; }

    try {
        const userRef = doc(db, "users", userID);
        await setDoc(userRef, gameState, { merge: true });
        
        if(showIcon && ind) { 
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Saved'; 
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
        console.log("Kayıt Başarılı.");
    } catch (error) {
        // HATA VARSA EKRANA BAS!
        alert("❌ KAYIT HATASI: Oyun veritabanına yazamıyor!\n" + error.message);
        console.error("KAYIT HATASI:", error);
    }
}

// --- DİĞER FONKSİYONLAR (Kısa tuttum, çalışması için yeterli) ---
function finalizeLoad() { recalcStats(); updateUI(); }
function recalcStats() { /* Hesaplama mantığı aynı */ }
function updateUI() { 
    if(document.getElementById('main-balance')) document.getElementById('main-balance').innerText = gameState.balance.toFixed(7);
    if(document.getElementById('mobile-balance')) document.getElementById('mobile-balance').innerText = gameState.balance.toFixed(7);
}
// (Geri kalan renderMarket, processWithdraw vb. fonksiyonların aynı kalabilir veya aşağıya ekleyebilirsin)
// Hata kaynağını bulmak için üstteki Load/Save kısımları yeterli.
function renderMarket() {} 
function showPage() {}
function initChart() {}
function processWithdraw() {}

window.gameApp = { processWithdraw, showPage };
