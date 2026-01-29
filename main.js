// main.js - FULL ENTEGRE SÜRÜM (FİNAL)

// --- 1. BÖLÜM: FIREBASE AYARLARI ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

// Firebase Başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserUID = null;
let isDataLoaded = false;

// --- 2. BÖLÜM: OYUN AYARLARI ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node",      priceTON: 10,  priceStars: 50,    hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,   hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",    priceTON: 60,  priceStars: 300,   hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",       priceTON: 90,  priceStars: 450,   hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",    priceTON: 120, priceStars: 600,   hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",       priceTON: 150, priceStars: 750,   hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, priceStars: 900,   hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",   priceTON: 200, priceStars: 1000, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];

// Gelir hesapla
products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

// Varsayılan Veri
const defaultState = {
    balance: 10.0000000,
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: [],
    lastLogin: Date.now()
};

let gameState = { ...defaultState };
let minLoop;
let chart;

// --- 3. BÖLÜM: BAŞLATMA VE AUTH (DÜZELTİLMİŞ) ---

document.addEventListener('DOMContentLoaded', () => {
    // UI Başlat
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
    }
    
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    // DİKKAT: Burada 'btn-withdraw' için addEventListener YOK. 
    // İşlem HTML tarafındaki onclick="window.gameApp.processWithdraw()" ile yapılıyor.

    // Otomatik Kayıt
    setInterval(() => { if(isDataLoaded) saveGame(); }, 60000);
    window.addEventListener('beforeunload', () => { if(isDataLoaded) saveGame(); });

    // Firebase Auth Başlat
    initAuth();
});

function initAuth() {
    showToast("Server connection...", "info");
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("🔐 Giriş Yapıldı:", user.uid);
            currentUserUID = user.uid;
            loadGameData();
        } else {
            console.log("👤 Anonim Giriş Yapılıyor...");
            signInAnonymously(auth).catch((error) => {
                console.error("Auth Hatası:", error);
                showToast("Connection Failed!", "error");
            });
        }
    });
}

// --- 4. BÖLÜM: VERİ YÖNETİMİ (FIRESTORE) ---

async function loadGameData() {
    if (!currentUserUID) return;

    try {
        const docRef = doc(db, "users", currentUserUID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("📥 Veri Yüklendi");
            const cloudData = docSnap.data();
            gameState = { ...defaultState, ...cloudData };
            
            // Offline Kazanç Hesapla
            checkOfflineEarnings();
        } else {
            console.log("🆕 Yeni Kullanıcı");
            saveGame(); // İlk veriyi oluştur
        }

        isDataLoaded = true;
        recalcStats();
        
        if (gameState.hashrate > 0) {
            gameState.mining = true;
            activateSystem();
        }
        
        updateUI();
        renderHistory();
        renderInventory();
        showToast("Ready to mine!", "success");

    } catch (error) {
        console.error("Yükleme Hatası:", error);
        showToast("Data Load Error", "error");
    }
}

async function saveGame() {
    if (!isDataLoaded || !currentUserUID) return;

    gameState.lastLogin = Date.now();
    
    // Görsel efekt
    const ind = document.getElementById('save-indicator');
    if(ind) { ind.style.opacity = '1'; setTimeout(() => { ind.style.opacity = '0'; }, 2000); }

    try {
        const docRef = doc(db, "users", currentUserUID);
        await setDoc(docRef, gameState, { merge: true });
        console.log("💾 Kayıt Başarılı");
    } catch (error) {
        console.error("Kayıt Hatası:", error);
    }
}

function checkOfflineEarnings() {
    if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
        const now = Date.now();
        const secondsPassed = (now - gameState.lastLogin) / 1000;
        
        if (secondsPassed > 10) {
            const earned = secondsPassed * gameState.income;
            gameState.balance += earned;
            
            const modal = document.getElementById('offline-modal');
            const amountTxt = document.getElementById('offline-amount');
            
            if(modal && amountTxt) {
                amountTxt.innerText = earned.toFixed(7);
                modal.style.display = 'flex';
            }
        }
    }
}

// --- 5. BÖLÜM: OYUN MANTIĞI ---

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
    if(ind) { ind.classList.remove('bg-gray-500'); ind.classList.add('bg-green-500', 'animate-pulse'); }
    if(txt) { txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold"; }
    
    startLoop();
}

function startLoop() {
    clearInterval(minLoop);
    minLoop = setInterval(() => {
        // RAM üzerindeki bakiyeyi artır
        gameState.balance += (gameState.income / 10);
        updateUI();
        updateChart(gameState.hashrate);
    }, 100);
}

// Global'e Açılan Fonksiyonlar (HTML'den erişim için şart)
window.gameApp = {
    buyWithTON: function(id) {
        if(!isDataLoaded) { showToast("Wait for sync...", "error"); return; }
        
        const p = products.find(x => x.id === id);
        if(gameState.balance >= p.priceTON) {
            gameState.balance -= p.priceTON;
            
            // Envanter güncelle
            if(!gameState.inventory[id]) gameState.inventory[id] = 0;
            gameState.inventory[id]++;
            
            if(!gameState.mining) {
                gameState.mining = true;
                activateSystem();
            }
            
            showToast(`Bought ${p.name}`, "success");
            recalcStats();
            updateUI();
            renderMarket();
            renderInventory();
            saveGame(); // Hemen kaydet
        } else {
            showToast("Insufficient Balance", "error");
        }
    },

    buyWithStars: function(id) {
        showToast("Coming Soon", "info");
    },

    processWithdraw: function() {
        if(!isDataLoaded) return;
        
        const walletInput = document.getElementById('wallet-address');
        const amountInput = document.getElementById('withdraw-amount');
        const val = parseFloat(amountInput.value);
        const addr = walletInput.value;

        if(!addr || addr.length < 5) { showToast("Invalid Wallet", "error"); return; }
        if(!val || val < 50) { showToast("Min Withdraw: 50 TON", "error"); return; }
        if(val > gameState.balance) { showToast("No Funds", "error"); return; }

        gameState.balance -= val;
        gameState.history.unshift({
            id: Date.now(),
            amount: val,
            status: "Pending",
            date: new Date().toLocaleTimeString(),
            addr: addr
        });

        updateUI();
        renderHistory();
        saveGame();
        amountInput.value = "";
        showToast("Request Sent", "success");
    },

    showPage: showPage, // Aşağıda tanımlı
    closeModal: function() {
        document.getElementById('offline-modal').style.display = 'none';
    }
};

// --- UI HELPERS ---

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const p = document.getElementById('page-' + pageId);
    if(p) p.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById('nav-' + pageId);
    if(nav) nav.classList.add('active');

    // Desktop Sidebar güncelleme
    document.querySelectorAll('.desktop-sidebar .nav-item').forEach(el => {
        el.classList.remove('bg-white/10');
        const icon = el.querySelector('i');
        if(icon) icon.classList.remove('text-cyan-400', 'text-yellow-400');
    });

    const sideItem = document.getElementById('side-' + pageId);
    if(sideItem) {
        sideItem.classList.add('bg-white/10');
        const icon = sideItem.querySelector('i');
        if(icon) icon.classList.add(pageId === 'market' ? 'text-yellow-400' : 'text-cyan-400');
    }

    if(pageId === 'inventory') renderInventory();
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    const els = {
        main: document.getElementById('main-balance'),
        mob: document.getElementById('mobile-balance'),
        wall: document.getElementById('wallet-balance-display'),
        hash: document.getElementById('dash-hash'),
        daily: document.getElementById('dash-daily'),
        inc: document.getElementById('dash-income'),
        dev: document.getElementById('dash-devices')
    };

    if(els.main) els.main.innerText = b + " TON";
    if(els.mob) els.mob.innerText = b;
    if(els.wall) els.wall.innerText = b;
    if(els.hash) els.hash.innerText = gameState.hashrate.toLocaleString();
    if(els.daily) els.daily.innerText = (gameState.income * 86400).toFixed(2);
    if(els.inc) els.inc.innerText = gameState.income.toFixed(7);
    if(els.dev) els.dev.innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);

    // Buton Kontrolü
    document.querySelectorAll('.btn-ton-check').forEach(btn => {
        const price = parseFloat(btn.getAttribute('data-price'));
        btn.disabled = gameState.balance < price;
    });
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        const dailyInc = (p.income * 86400).toFixed(2);
        
        const html = `
        <div class="glass-panel p-5 rounded-2xl flex flex-col justify-between transition border border-gray-800 hover:border-cyan-500/50">
            <div class="flex justify-between items-start mb-4">
                <div class="p-4 bg-black/40 rounded-xl ${p.color} text-2xl shadow-inner border border-white/5"><i class="fa-solid ${p.icon}"></i></div>
                <div class="text-xs bg-gray-900 px-3 py-1 rounded-full text-gray-400 border border-gray-700">Owned: ${count}</div>
            </div>
            <div class="mb-4">
                <h3 class="font-bold text-lg text-white">${p.name}</h3>
                <div class="flex items-center gap-3 mt-2 text-xs"><span class="text-gray-400"><i class="fa-solid fa-bolt text-yellow-500"></i> ${p.hash} TH/s</span></div>
                <div class="text-xs text-green-400 mt-1 font-bold">+${dailyInc} TON / Day</div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.gameApp.buyWithTON(${p.id})" class="btn-ton-check w-1/2 btn-ton py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1" data-price="${p.priceTON}">
                    ${p.priceTON} TON
                </button>
                <button onclick="window.gameApp.buyWithStars(${p.id})" class="w-1/2 btn-star py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1">
                    ${p.priceStars} <i class="fa-solid fa-star text-white"></i>
                </button>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
    updateUI();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = '';
    
    let hasItem = false;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        if(count > 0) {
            hasItem = true;
            const html = `
            <div class="glass-panel p-4 rounded-xl flex items-center gap-4 border-l-4 border-cyan-500 bg-gradient-to-r from-cyan-900/10 to-transparent">
                <div class="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center ${p.color} text-2xl"><i class="fa-solid ${p.icon}"></i></div>
                <div class="flex-1">
                    <h4 class="font-bold text-white">${p.name}</h4>
                    <div class="text-xs text-gray-400">Total: <span class="text-white">${(p.hash * count).toLocaleString()} TH/s</span></div>
                </div>
                <div class="text-xl font-bold digit-font text-white bg-white/5 px-3 py-1 rounded-lg">x${count}</div>
            </div>`;
            list.insertAdjacentHTML('beforeend', html);
        }
    });
    
    if(!hasItem) list.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-10 italic">Warehouse empty.</div>';
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if(!list) return;
    
    if(gameState.history.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-500 text-sm py-10 italic">No transaction history found.</div>';
        return;
    }
    
    list.innerHTML = '';
    gameState.history.forEach(tx => {
        const html = `
        <div class="bg-black/30 p-4 rounded-xl flex justify-between items-center border border-gray-700 mb-2">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><i class="fa-solid fa-clock"></i></div>
                <div>
                    <div class="text-xs text-gray-400">Withdrawal</div>
                    <div class="text-white font-bold digit-font">${tx.amount.toFixed(2)} TON</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-xs text-yellow-500 font-bold">${tx.status}</div>
                <div class="text-[10px] text-gray-500 font-mono mt-1">${tx.date}</div>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Görsel efektler (Chart & BG)
function initChart() {
    const ctx = document.getElementById('miningChart');
    if(!ctx) return;
    chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: { labels: Array(20).fill(''), datasets: [{ data: Array(20).fill(0), borderColor: '#00f2ff', borderWidth: 2, tension: 0.4, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } }, animation: false }
    });
}
function updateChart(val) {
    if(!chart) return;
    const f = (Math.random() - 0.5) * (val * 0.1); 
    let v = val + f; if(v<0) v=0;
    chart.data.datasets[0].data.push(v);
    chart.data.datasets[0].data.shift();
    chart.update();
}
function initBg() {
    // Basit arka plan animasyonu
    const cvs = document.getElementById('bg-canvas');
    if(cvs) {
        cvs.width = window.innerWidth; cvs.height = window.innerHeight;
    }
}
