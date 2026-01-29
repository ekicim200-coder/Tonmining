// --- CONFIGURATION ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node",     priceTON: 10,  hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",     priceTON: 30,  hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",   priceTON: 60,  hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",      priceTON: 90,  hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",   priceTON: 120, hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",      priceTON: 150, hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",   priceTON: 200, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];

products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

let gameState = {
    balance: 0.00,
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: [],
    lastLogin: Date.now()
};

// --- USER ID SETUP ---
let userID = localStorage.getItem('nexus_uid') || "user_" + Math.floor(Math.random() * 999999);
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    userID = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
}
localStorage.setItem('nexus_uid', userID);

// --- CORE FUNCTIONS ---

async function saveGame() {
    if (!window.db) return;
    const ind = document.getElementById('save-indicator');
    if(ind) ind.style.opacity = '1';

    try {
        await window.db.collection("users").doc(userID).set({
            ...gameState,
            lastLogin: Date.now()
        }, { merge: true });
        if(ind) setTimeout(() => ind.style.opacity = '0', 2000);
    } catch (e) { console.error("Save Error:", e); }
}

async function loadGame() {
    try {
        const doc = await window.db.collection("users").doc(userID).get();
        if (doc.exists) {
            gameState = { ...gameState, ...doc.data() };
            console.log("✅ Veri Buluttan Çekildi.");
        } else {
            console.log("🆕 Yeni Kullanıcı.");
            await saveGame();
        }
        finalizeLoad();
    } catch (e) { 
        console.error("Load Error:", e);
        finalizeLoad();
    }
}

function finalizeLoad() {
    recalcStats();
    
    // Offline Kazanç
    if (gameState.income > 0) {
        const secondsPassed = (Date.now() - gameState.lastLogin) / 1000;
        if (secondsPassed > 10) {
            const earned = secondsPassed * gameState.income;
            gameState.balance += earned;
            document.getElementById('offline-amount').innerText = earned.toFixed(5);
            document.getElementById('offline-modal').classList.remove('hidden');
        }
    }

    if (gameState.hashrate > 0) activateSystem();
    renderMarket();
    updateUI();
    initChart();
}

// --- APP LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    window.Telegram?.WebApp?.expand();
    
    // Önce Giriş Yap, Sonra Yükle (Production Modu İçin Şart)
    firebase.auth().signInAnonymously().then(() => {
        console.log("🔑 Auth Başarılı.");
        loadGame();
    }).catch(err => console.error("Auth Hatası:", err));

    initBg();
    setInterval(saveGame, 60000);
});

function recalcStats() {
    let totalHash = 0;
    let totalIncome = 0;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        totalHash += p.hash * count;
        totalIncome += p.income * count;
    });
    gameState.hashrate = totalHash;
    gameState.income = totalIncome;
}

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    ind.classList.replace('bg-gray-500', 'bg-green-500');
    ind.classList.add('animate-pulse');
    txt.innerText = "ONLINE";
    txt.classList.replace('text-gray-500', 'text-green-400');
    startLoop();
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

function updateUI() {
    const b = gameState.balance.toFixed(7);
    document.getElementById('main-balance').innerText = b + " TON";
    document.getElementById('wallet-balance-display').innerText = b;
    document.getElementById('dash-hash').innerText = gameState.hashrate.toLocaleString();
    document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    if(pageId === 'inventory') renderInventory();
}

function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl border border-gray-800";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-3 bg-black/40 rounded-xl ${p.color}"><i class="fa-solid ${p.icon} text-xl"></i></div>
                <div class="text-[10px] text-gray-500">Own: ${gameState.inventory[p.id] || 0}</div>
            </div>
            <h3 class="font-bold text-white mb-1">${p.name}</h3>
            <div class="text-[10px] text-green-400 font-bold mb-4">+${(p.income * 86400).toFixed(2)} TON/Day</div>
            <button onclick="window.gameApp.buyWithTON(${p.id})" class="w-full bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-bold border border-white/10 transition">
                ${p.priceTON} TON
            </button>
        `;
        list.appendChild(div);
    });
}

function buyWithTON(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.priceTON) {
        gameState.balance -= p.priceTON;
        gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
        recalcStats();
        activateSystem();
        renderMarket();
        updateUI();
        saveGame();
    } else {
        alert("Insufficient Balance!");
    }
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        if(count > 0) {
            const div = document.createElement('div');
            div.className = "glass-panel p-4 rounded-xl flex items-center justify-between";
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fa-solid ${p.icon} ${p.color}"></i>
                    <span class="text-sm font-bold">${p.name}</span>
                </div>
                <div class="digit-font text-cyan-400">x${count}</div>
            `;
            list.appendChild(div);
        }
    });
}

// --- VISUALS ---
let chart;
function initChart() {
    const ctx = document.getElementById('miningChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array(20).fill(''), datasets: [{ data: Array(20).fill(0), borderColor: '#00f2ff', borderWidth: 2, tension: 0.4, pointRadius: 0, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } }, animation: false }
    });
}
function updateChart(val) {
    const noise = (Math.random() - 0.5) * (val * 0.1);
    chart.data.datasets[0].data.push(val + noise);
    chart.data.datasets[0].data.shift();
    chart.update();
}

function initBg() {
    const cvs = document.getElementById('bg-canvas'); if(!cvs) return;
    const ctx = cvs.getContext('2d');
    let w, h;
    function res() { w=window.innerWidth; h=window.innerHeight; cvs.width=w; cvs.height=h; }
    window.addEventListener('resize', res); res();
    function ani() { ctx.clearRect(0,0,w,h); ctx.fillStyle="rgba(0,242,255,0.05)"; ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2); requestAnimationFrame(ani); }
    ani();
}

window.gameApp = {
    showPage,
    buyWithTON,
    closeModal: () => document.getElementById('offline-modal').classList.add('hidden'),
    processWithdraw: () => alert("Withdrawal system pending manual verification.")
};
