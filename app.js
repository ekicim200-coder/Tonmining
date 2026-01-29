// --- CONFIGURATION ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node",      priceTON: 10,  priceStars: 50,   hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,  hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",    priceTON: 60,  priceStars: 300,  hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",       priceTON: 90,  priceStars: 450,  hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",    priceTON: 120, priceStars: 600,  hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",       priceTON: 150, priceStars: 750,  hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, priceStars: 900,  hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",    priceTON: 200, priceStars: 1000, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];

// Gelir hesaplaması
products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

let gameState = {
    balance: 10.0000000,
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: [],
    lastLogin: Date.now()
};

let userID = null;

// --- AUTHENTICATION & INIT ---

async function startAuth() {
    try {
        // Firebase ile anonim giriş yap
        const userCredential = await firebase.auth().signInAnonymously();
        userID = userCredential.user.uid;
        
        // GLOBAL DB TANIMLAMASI (Hata Çözümü İçin Kritik)
        window.db = firebase.firestore(); 

        console.log("✅ Firebase Auth Başarılı. UID:", userID);
        
        // Giriş başarılı olduktan sonra verileri yükle
        await loadGame(); 
    } catch (error) {
        console.error("❌ Giriş hatası:", error.code, error.message);
        showToast("Connection Error: Auth Failed", 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand(); 

    // Önce Auth başlatılıyor
    startAuth();

    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    const withdrawBtn = document.getElementById('btn-withdraw');
    if(withdrawBtn) withdrawBtn.addEventListener('click', processWithdraw);
    
    // Otomatik kayıt
    setInterval(() => { if(userID) saveGame(); }, 60000);
});

// --- FIREBASE CORE FUNCTIONS (GÜVENLİ HALE GETİRİLDİ) ---

async function saveGame() {
    if (!userID) return;
    
    // Veritabanı hazır mı kontrol et
    if (!window.db) {
        console.warn("Veritabanı henüz hazır değil, kayıt atlandı.");
        return;
    }

    gameState.lastLogin = Date.now();
    
    const ind = document.getElementById('save-indicator');
    if(ind) { ind.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Saving...'; ind.style.opacity = '1'; }

    try {
        // window.db kullanıyoruz
        await window.db.collection("users").doc(userID).set(gameState, { merge: true });
        
        if(ind) { 
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Cloud Saved'; 
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
        console.log("☁️ Buluta kaydedildi.");
    } catch (error) {
        console.error("Firebase Save Error:", error);
        if(ind) { ind.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Save Failed'; }
    }
}

async function loadGame() {
    if (!userID) return;

    // Veritabanı hazır değilse bekle ve tekrar dene (Retry Mechanism)
    if (!window.db) {
        console.log("DB bağlantısı bekleniyor...");
        setTimeout(loadGame, 1000);
        return;
    }

    console.log("Veri Buluttan Çekiliyor... UID:", userID);
    try {
        const docSnap = await window.db.collection("users").doc(userID).get();

        if (docSnap.exists) {
            const parsed = docSnap.data();
            // Mevcut state ile gelen veriyi birleştir
            gameState = { ...gameState, ...parsed };
            console.log("✅ Veri başarıyla yüklendi.");
        } else {
            console.log("Yeni kullanıcı oluşturuluyor...");
            await saveGame();
        }
    } catch (error) {
        console.error("Veri çekme hatası:", error);
    }
    // Her durumda (hata olsa bile) oyunu başlat
    finalizeLoad();
}

// --- GAME LOGIC ---

function finalizeLoad() {
    recalcStats();
    
    if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
        const now = Date.now();
        const secondsPassed = (now - gameState.lastLogin) / 1000;
        if (secondsPassed > 10) {
            const earned = secondsPassed * gameState.income;
            gameState.balance += earned;
            
            const offlineEl = document.getElementById('offline-amount');
            if(offlineEl) offlineEl.innerText = earned.toFixed(7);
            
            const modalEl = document.getElementById('offline-modal');
            if(modalEl) modalEl.style.display = 'flex';
        }
    }

    if (gameState.hashrate > 0) {
        gameState.mining = true;
        activateSystem();
    } else {
        deactivateSystem();
    }
    
    renderHistory();
    updateUI();
}

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

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type} p-4 rounded-xl mb-2 text-white bg-black/80 border border-white/10 flex items-center gap-2 shadow-lg`;
    let icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'success' ? 'fa-circle-check' : 'fa-info-circle');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- UI & UPDATES ---
function updateUI() {
    const b = gameState.balance.toFixed(7);
    const els = {
        main: document.getElementById('main-balance'),
        mobile: document.getElementById('mobile-balance'),
        wallet: document.getElementById('wallet-balance-display'),
        hash: document.getElementById('dash-hash'),
        daily: document.getElementById('dash-daily'),
        income: document.getElementById('dash-income'),
        devices: document.getElementById('dash-devices')
    };

    if(els.main) els.main.innerText = b + " TON";
    if(els.mobile) els.mobile.innerText = b; 
    if(els.wallet) els.wallet.innerText = b;
    if(els.hash) els.hash.innerText = gameState.hashrate.toLocaleString();
    if(els.daily) els.daily.innerText = (gameState.income * 86400).toFixed(2);
    if(els.income) els.income.innerText = gameState.income.toFixed(7);
    if(els.devices) els.devices.innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
}

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind && txt) {
        ind.classList.replace('bg-gray-500', 'bg-green-500');
        ind.classList.add('animate-pulse');
        txt.innerText = "ONLINE"; 
        txt.className = "text-green-400 font-bold";
    }
    startLoop();
}

function deactivateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind && txt) {
        ind.classList.replace('bg-green-500', 'bg-gray-500');
        ind.classList.remove('animate-pulse');
        txt.innerText = "STANDBY";
        txt.className = "text-gray-500 font-bold";
    }
    clearInterval(minLoop);
}

let minLoop;
function startLoop() {
    clearInterval(minLoop);
    minLoop = setInterval(() => {
        gameState.balance += (gameState.income / 10);
        updateUI();
        if(typeof updateChart === 'function') updateChart(gameState.hashrate);
    }, 100);
}

// Global Fonksiyonlar (Market Render vb. eklenebilir)
function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = "glass-panel p-6 rounded-2xl relative group hover:border-cyan-500/50 transition border border-gray-700";
        item.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center text-2xl ${p.color}">
                    <i class="fa-solid ${p.icon}"></i>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-gray-500 uppercase font-bold">Hashrate</div>
                    <div class="text-lg font-bold text-white font-mono">${p.hash} TH/s</div>
                </div>
            </div>
            <h3 class="text-xl font-bold text-white mb-1">${p.name}</h3>
            <div class="text-xs text-gray-400 mb-6">ROI: ${ROI_DAYS} Days</div>
            
            <div class="flex gap-2">
                <button onclick="window.gameApp.buyWithTON(${p.id})" class="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-sm transition text-white">
                    ${p.priceTON} TON
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = '';
    
    let hasItems = false;
    Object.keys(gameState.inventory).forEach(key => {
        const count = gameState.inventory[key];
        if(count > 0) {
            hasItems = true;
            const p = products.find(x => x.id == key);
            const item = document.createElement('div');
            item.className = "glass-panel p-4 rounded-xl flex items-center justify-between border border-gray-700";
            item.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center ${p.color}">
                        <i class="fa-solid ${p.icon}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-white">${p.name}</div>
                        <div class="text-xs text-gray-500">Active Units</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-bold text-white digit-font">${count}</div>
                    <div class="text-xs text-cyan-400 font-bold">RUNNING</div>
                </div>
            `;
            list.appendChild(item);
        }
    });

    if(!hasItems) {
        list.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-10">No active rigs found. Visit Market.</div>';
    }
}

function renderHistory() {
    // İşlem geçmişi render (opsiyonel)
}

function initChart() {
    // Grafik başlatma (opsiyonel)
}

function initBg() {
    // Arka plan efekti (opsiyonel)
}

function processWithdraw() {
    const amt = parseFloat(document.getElementById('withdraw-amount').value);
    const addr = document.getElementById('wallet-address').value;
    
    if(!addr || addr.length < 5) return showToast('Invalid Wallet Address', 'error');
    if(amt < 50) return showToast('Min Withdraw: 50 TON', 'error');
    if(amt > gameState.balance) return showToast('Insufficient Balance', 'error');

    showToast('Withdrawal request sent!', 'success');
}

// Global scope expose
window.gameApp = {
    buyWithTON: (id) => {
        const p = products.find(x => x.id === id);
        if(gameState.balance >= p.priceTON) {
            gameState.balance -= p.priceTON;
            gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
            recalcStats();
            if(!gameState.mining) activateSystem();
            saveGame();
            renderMarket();
            showToast(`${p.name} deployed!`, 'success');
        } else {
            showToast("Insufficient TON", 'error');
        }
    },
    showPage: (pageId) => {
        document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById('page-' + pageId);
        if(target) target.classList.remove('hidden');
        if(pageId === 'inventory') renderInventory();
    },
    processWithdraw: processWithdraw,
    closeModal: () => { 
        const modal = document.getElementById('offline-modal');
        if(modal) modal.style.display = 'none'; 
    }
};
