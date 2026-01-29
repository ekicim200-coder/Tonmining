// --- CONFIGURATION ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node",     priceTON: 10,  priceStars: 50,   hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,  hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",    priceTON: 60,  priceStars: 300,  hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",       priceTON: 90,  priceStars: 450,  hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",    priceTON: 120, priceStars: 600,  hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",       priceTON: 150, priceStars: 750,  hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, priceStars: 900,  hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",    priceTON: 200, priceStars: 1000, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];

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

let userID = null; // Auth sonrası atanacak

// --- AUTHENTICATION & INIT ---

async function startAuth() {
    try {
        // Firebase ile anonim giriş yap
        const userCredential = await firebase.auth().signInAnonymously();
        userID = userCredential.user.uid;
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

    // Önce Auth başlatılıyor, loadGame onun içinden tetiklenecek
    startAuth();

    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    // Event Listeners
    const withdrawBtn = document.getElementById('btn-withdraw');
    if(withdrawBtn) withdrawBtn.addEventListener('click', processWithdraw);
    
    // Otomatik kayıt
    setInterval(() => { if(userID) saveGame(); }, 60000);
});

// --- FIREBASE CORE FUNCTIONS ---

async function saveGame() {
    if (!userID) return;
    gameState.lastLogin = Date.now();
    
    const ind = document.getElementById('save-indicator');
    if(ind) { ind.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Saving...'; ind.style.opacity = '1'; }

    try {
        const db = firebase.firestore();
        await db.collection("users").doc(userID).set(gameState, { merge: true });
        
        if(ind) { 
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Cloud Saved'; 
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
    } catch (error) {
        console.error("Firebase Save Error:", error);
        if(ind) { ind.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Save Failed'; }
    }
}

async function loadGame() {
    console.log("Veri Buluttan Çekiliyor... UID:", userID);
    try {
        const db = firebase.firestore();
        const docSnap = await db.collection("users").doc(userID).get();

        if (docSnap.exists()) {
            const parsed = docSnap.data();
            gameState = { ...gameState, ...parsed };
            console.log("Veri başarıyla yüklendi.");
        } else {
            console.log("Yeni kullanıcı oluşturuluyor...");
            await saveGame();
        }
    } catch (error) {
        console.error("Veri çekme hatası:", error);
    }
    finalizeLoad();
}

// --- GAME LOGIC (Rest of your functions) ---

function finalizeLoad() {
    recalcStats();
    
    if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
        const now = Date.now();
        const secondsPassed = (now - gameState.lastLogin) / 1000;
        if (secondsPassed > 10) {
            const earned = secondsPassed * gameState.income;
            gameState.balance += earned;
            document.getElementById('offline-amount').innerText = earned.toFixed(7);
            document.getElementById('offline-modal').style.display = 'flex';
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
    document.getElementById('main-balance').innerText = b + " TON";
    document.getElementById('mobile-balance').innerText = b; 
    document.getElementById('wallet-balance-display').innerText = b;
    document.getElementById('dash-hash').innerText = gameState.hashrate.toLocaleString();
    document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
    document.getElementById('dash-income').innerText = gameState.income.toFixed(7);
    document.getElementById('dash-devices').innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
}

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    ind.classList.replace('bg-gray-500', 'bg-green-500');
    ind.classList.add('animate-pulse');
    txt.innerText = "ONLINE"; 
    txt.className = "text-green-400 font-bold";
    startLoop();
}

function deactivateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    ind.classList.replace('bg-green-500', 'bg-gray-500');
    ind.classList.remove('animate-pulse');
    txt.innerText = "STANDBY";
    clearInterval(minLoop);
}

let minLoop;
function startLoop() {
    clearInterval(minLoop);
    minLoop = setInterval(() => {
        gameState.balance += (gameState.income / 10);
        updateUI();
        if(chart) updateChart(gameState.hashrate);
    }, 100);
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
        document.getElementById('page-' + pageId).classList.remove('hidden');
        if(pageId === 'inventory') renderInventory();
    },
    closeModal: () => { document.getElementById('offline-modal').style.display = 'none'; }
};

// ... (initChart, initBg ve renderMarket gibi görsel fonksiyonlar aynen kalabilir)
