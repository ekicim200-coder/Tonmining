// app.js (TANI MODU)
import { db, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs, where } from './firebase-config.js';

console.log("🚀 TANI MODU BAŞLATILIYOR...");
// app.js
import { db, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs, where } from './firebase-config.js';

console.log("🚀 Oyun Motoru Başlatılıyor...");

// --- 1. KULLANICI KİMLİĞİ (SABİTLENDİ) ---
// Verilerin silinmemesi için burayı sabitledik.
const userID = "PATRON_USER_1"; 
console.log("👤 GİRİŞ YAPAN KULLANICI:", userID);

const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

// --- ÜRÜNLER ---
const products = [
    { id: 1, name: "Nano Node",      priceTON: 10,  priceStars: 50,   hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,  hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",    priceTON: 60,  priceStars: 300,  hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",       priceTON: 90,  priceStars: 450,  hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",    priceTON: 120, priceStars: 600,  hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",       priceTON: 150, priceStars: 750,  hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, priceStars: 900,  hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",   priceTON: 200, priceStars: 1000, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];
products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

// --- OYUN DURUMU ---
let gameState = {
    balance: 10.0000000, 
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    lastLogin: Date.now()
};

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    // Önce arayüzü çiz
    renderMarket();
    showPage('dashboard');
    initChart();
    
    // Sonra veriyi yükle
    loadGame(); 

    document.getElementById('btn-withdraw')?.addEventListener('click', processWithdraw);
    
    // Otomatik Kayıt (Her 15 saniyede bir)
    setInterval(() => { saveGame(false); }, 15000); 
});

// --- VERİTABANI: YÜKLEME ---
async function loadGame() {
    try {
        const userRef = doc(db, "users", userID);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            // Kayıt varsa üzerine yaz
            gameState = { ...gameState, ...docSnap.data() };
            console.log("✅ Veri Yüklendi:", gameState);
            
            // Yükleme tamamlandı uyarısı
            const ind = document.getElementById('save-indicator');
            if(ind) { ind.innerHTML = '<i class="fa-solid fa-check"></i> Data Loaded'; ind.style.opacity = '1'; setTimeout(() => ind.style.opacity='0', 2000); }
            
            finalizeLoad();
        } else {
            console.log("🆕 Kayıt bulunamadı, yeni hesap oluşturuluyor...");
            saveGame(true);
        }
    } catch (error) {
        console.error("YÜKLEME HATASI:", error);
        alert("Bağlantı Hatası: Veriler yüklenemedi.\n" + error.message);
    }
}

// --- VERİTABANI: KAYDETME ---
async function saveGame(showIcon = true) {
    gameState.lastLogin = Date.now();
    const ind = document.getElementById('save-indicator');
    if(showIcon && ind) { ind.innerHTML = 'Saving...'; ind.style.opacity = '1'; }

    try {
        const userRef = doc(db, "users", userID);
        await setDoc(userRef, gameState, { merge: true });
        
        if(showIcon && ind) { 
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Saved'; 
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
        console.log("💾 Oyun Kaydedildi.");
    } catch (error) {
        console.error("KAYIT HATASI:", error);
        if(showIcon) alert("Kayıt Başarısız! İnternetini kontrol et.");
    }
}

function finalizeLoad() {
    recalcStats();
    updateUI();
    if (gameState.hashrate > 0) {
        gameState.mining = true;
        activateSystem();
    }
}

// --- DİĞER FONKSİYONLAR ---
function recalcStats() {
    let totalHash = 0;
    let totalIncome = 0;
    products.forEach(p => {
        if(gameState.inventory[p.id]) {
            totalHash += p.hash * gameState.inventory[p.id];
            totalIncome += p.income * gameState.inventory[p.id];
        }
    });
    gameState.hashrate = totalHash;
    gameState.income = totalIncome;
}

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind) { ind.className = "w-2 h-2 rounded-full bg-green-500 animate-pulse"; }
    if(txt) { txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold"; }
    startLoop();
}

function buyWithTON(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.priceTON) {
        gameState.balance -= p.priceTON;
        addMachine(id);
    } else {
        alert("Yetersiz Bakiye!");
    }
}

function addMachine(id) {
    if(!gameState.inventory[id]) gameState.inventory[id] = 0;
    gameState.inventory[id]++;
    
    if(!gameState.mining) {
        gameState.mining = true;
        activateSystem();
    }
    
    recalcStats();
    updateUI();
    renderMarket();
    saveGame(true); // Satın alınca HEMEN kaydet
}

// Arayüz ve Loop Fonksiyonları (Kısaltıldı, standart mantık)
function updateUI() {
    if(document.getElementById('main-balance')) document.getElementById('main-balance').innerText = gameState.balance.toFixed(7);
    if(document.getElementById('mobile-balance')) document.getElementById('mobile-balance').innerText = gameState.balance.toFixed(7);
    if(document.getElementById('dash-hash')) document.getElementById('dash-hash').innerText = gameState.hashrate;
    // ... diğer UI güncellemeleri
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        // HTML oluşturma kodu...
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl"; // Basit stil
        div.innerHTML = `
            <div class="text-white font-bold">${p.name}</div>
            <div class="text-xs text-gray-400">Price: ${p.priceTON} TON</div>
            <div class="text-xs text-green-400">Owned: ${count}</div>
            <button onclick="window.gameApp.buyWithTON(${p.id})" class="mt-2 w-full bg-blue-600 text-white py-2 rounded">Buy</button>
        `;
        list.appendChild(div);
    });
}

// Gerekli global dışa aktarımlar
window.gameApp = { buyWithTON, showPage: (page) => {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page)?.classList.add('active');
}};

let minLoop;
function startLoop() {
    clearInterval(minLoop);
    minLoop = setInterval(() => {
        if(gameState.income > 0) {
            gameState.balance += (gameState.income / 10);
            updateUI();
        }
    }, 100);
}

// Chart ve Bg (Sadelik için boş bıraktım, istersen eklenir)
function initChart() {}
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

