// app.js

// 1. Her şeyi tek dosyadan çekiyoruz (Karışıklık olmaması için)
import { db, doc, getDoc, setDoc } from './firebase-config.js';

// --- CONFIGURATION ---
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

let currentUserId = "test_user_01"; 

document.addEventListener('DOMContentLoaded', async () => {
    // Telegram WebApp Başlatma
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            tg.setHeaderColor('#020205');
            tg.setBackgroundColor('#020205');
        } catch(e) {}

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            currentUserId = tg.initDataUnsafe.user.id.toString();
            console.log("Telegram User ID:", currentUserId);
        }
    }

    // Oyunu Yükle
    await loadGame();
    
    // UI Başlatma
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    // Otomatik Kayıt
    setInterval(() => { saveGame(); }, 60000);
    window.addEventListener('beforeunload', () => { saveGame(); });
});

// --- CORE FUNCTIONS (FIREBASE ENTEGRASYONLU) ---

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type} bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 mb-3 animate-bounce-in`;
    let icon = type === 'error' ? 'fa-triangle-exclamation text-red-500' : (type === 'star' ? 'fa-star text-yellow-400' : 'fa-circle-check text-green-400');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// OYUNU KAYDET (Hem Local Hem Firebase)
async function saveGame() {
    gameState.lastLogin = Date.now();
    
    // 1. LocalStorage (Hızlı yedek)
    localStorage.setItem('nexusMinerV14', JSON.stringify(gameState));
    
    // 2. Firebase Firestore (Bulut Kaydı)
    try {
        await setDoc(doc(db, "users", currentUserId), gameState);
        
        const ind = document.getElementById('save-indicator');
        if(ind) {
            ind.classList.remove('hidden');
            setTimeout(() => { ind.classList.add('hidden'); }, 2000);
        }
    } catch (error) {
        console.error("Buluta kayıt hatası:", error);
    }
}

// OYUNU YÜKLE (Önce Firebase, Yoksa Local)
async function loadGame() {
    let loadedData = null;

    // 1. Önce Buluttan Çekmeyi Dene
    try {
        const docRef = doc(db, "users", currentUserId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            loadedData = docSnap.data();
            console.log("Veri Firebase'den yüklendi!");
        } else {
            console.log("Kullanıcı Firebase'de bulunamadı, yerel veriye bakılıyor.");
        }
    } catch (e) {
        console.log("İnternet yok veya Firebase hatası, LocalStorage kullanılıyor.", e);
    }

    // 2. Bulutta yoksa LocalStorage'a bak
    if (!loadedData) {
        const localSaved = localStorage.getItem('nexusMinerV14');
        if (localSaved) {
            try { loadedData = JSON.parse(localSaved); } catch(e) {}
        }
    }

    // 3. Veriyi State'e İşle
    if (loadedData) {
        gameState = { ...gameState, ...loadedData };
        
        if(!gameState.inventory) gameState.inventory = {};
        if(!gameState.history) gameState.history = [];

        recalcStats();
        
        // Çevrimdışı Kazanç Hesaplama
        if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
            const now = Date.now();
            const secondsPassed = (now - gameState.lastLogin) / 1000;
            
            if (secondsPassed > 10) {
                const earned = secondsPassed * gameState.income;
                gameState.balance += earned;
                
                const offlineEl = document.getElementById('offline-amount');
                const offlineModal = document.getElementById('offline-modal');
                if(offlineEl && offlineModal) {
                    offlineEl.innerText = earned.toFixed(7);
                    offlineModal.classList.remove('hidden');
                    offlineModal.style.display = 'flex';
                }
                saveGame();
            }
        }

        if (gameState.hashrate > 0) {
            gameState.mining = true;
            activateSystem();
        }
        renderHistory();
        updateUI();
    }
}

function closeModal() { 
    const m = document.getElementById('offline-modal');
    if(m) {
        m.style.display = 'none';
        m.classList.add('hidden');
    }
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

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind) { ind.classList.remove('bg-gray-500'); ind.classList.add('bg-green-500', 'animate-pulse'); }
    if(txt) { txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold"; }
    startLoop();
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if(target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const mob = document.getElementById('nav-' + pageId);
    if(mob) mob.classList.add('active');
    
    // Desktop Sidebar Active State
    const deskIds = ['side-dashboard', 'side-market', 'side-inventory', 'side-wallet'];
    deskIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) { 
            el.classList.remove('bg-white/10', 'text-cyan-400'); 
            const icon = el.querySelector('i');
            if(icon) icon.className = icon.className.replace('text-cyan-400', 'text-gray-400');
        }
    });
    
    const activeDesk = document.getElementById('side-' + pageId);
    if(activeDesk) {
        activeDesk.classList.add('bg-white/10', 'text-cyan-400');
        const icon = activeDesk.querySelector('i');
        if(icon) icon.classList.remove('text-gray-400');
        if(icon) icon.classList.add('text-cyan-400');
    }
    
    if(pageId === 'inventory') renderInventory();
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        if(!gameState.inventory[p.id]) gameState.inventory[p.id] = 0;
        const dailyInc = (p.income * 86400).toFixed(2);
        
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl flex flex-col justify-between transition border border-gray-800 hover:border-cyan-500/50";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-4 bg-black/40 rounded-xl ${p.color} text-2xl shadow-inner border border-white/5"><i class="fa-solid ${p.icon}"></i></div>
                <div class="text-xs bg-gray-900 px-3 py-1 rounded-full text-gray-400 border border-gray-700">Owned: <span id="owned-${p.id}">${gameState.inventory[p.id]}</span></div>
            </div>
            <div class="mb-4">
                <h3 class="font-bold text-lg text-white">${p.name}</h3>
                <div class="flex items-center gap-3 mt-2 text-xs"><span class="text-gray-400"><i class="fa-solid fa-bolt text-yellow-500"></i> ${p.hash} TH/s</span></div>
                <div class="text-xs text-green-400 mt-1 font-bold">+${dailyInc} TON / Day</div>
            </div>
            <div class="flex gap-2 mt-auto">
                <button onclick="window.gameApp.buyWithTON(${p.id})" class="btn-ton-check w-1/2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-[10px] md:text-xs flex justify-center items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed" data-price="${p.priceTON}">
                    ${p.priceTON} TON
                </button>
                <button onclick="window.gameApp.buyWithStars(${p.id})" class="w-1/2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl font-bold text-[10px] md:text-xs flex justify-center items-center gap-1 transition">
                    ${p.priceStars} <i class="fa-solid fa-star text-[10px]"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
    updateUI();
}

function buyWithTON(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.priceTON) {
        gameState.balance -= p.priceTON;
        addMachine(id, "TON");
    } else {
        showToast("Insufficient TON Balance", 'error');
    }
}

function buyWithStars(id) {
    showToast("Processing Star Payment...", 'star');
    setTimeout(() => {
        addMachine(id, "Stars");
    }, 1000); 
}

function addMachine(id, source) {
    const p = products.find(x => x.id === id);
    if (!gameState.inventory[id]) gameState.inventory[id] = 0;
    gameState.inventory[id]++;
    
    if(!gameState.mining) {
        gameState.mining = true;
        activateSystem();
        showToast("System Auto-Started!", 'success');
    } else {
        showToast(`Purchased ${p.name}!`, 'success');
    }
    
    const ownedLabel = document.getElementById(`owned-${id}`);
    if(ownedLabel) ownedLabel.innerText = gameState.inventory[id];

    recalcStats();
    updateUI();
    saveGame();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = '';
    let empty = true;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        if(count > 0) {
            empty = false;
            const div = document.createElement('div');
            div.className = "glass-panel p-4 rounded-xl flex items-center gap-4 border-l-4 border-cyan-500 bg-gradient-to-r from-cyan-900/10 to-transparent";
            div.innerHTML = `
                <div class="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center ${p.color} text-2xl"><i class="fa-solid ${p.icon}"></i></div>
                <div class="flex-1">
                    <h4 class="font-bold text-white">${p.name}</h4>
                    <div class="text-xs text-gray-400">Total: <span class="text-white">${(p.hash * count).toLocaleString()} TH/s</span></div>
                </div>
                <div class="text-xl font-bold digit-font text-white bg-white/5 px-3 py-1 rounded-lg">x${count}</div>
            `;
            list.appendChild(div);
        }
    });
    if(empty) list.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-gray-500 py-10 italic">Warehouse empty. Go to Market.</div>';
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if(!list) return;
    if(gameState.history.length === 0) { 
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-gray-600 text-sm italic">
                <i class="fa-regular fa-file-lines text-2xl mb-2 opacity-50"></i>
                No transaction history.
            </div>`; 
        return; 
    }
    list.innerHTML = '';
    gameState.history.forEach(tx => {
        const item = document.createElement('div');
        item.className = "bg-black/30 p-3 rounded-xl flex justify-between items-center border border-gray-700 hover:border-gray-500 transition mb-2";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><i class="fa-solid fa-clock"></i></div>
                <div>
                    <div class="text-[10px] text-gray-400">Withdrawal</div>
                    <div class="text-white font-bold digit-font text-sm">${tx.amount.toFixed(2)} TON</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-[10px] text-yellow-500 font-bold flex items-center justify-end gap-1"><i class="fa-solid fa-circle-notch fa-spin text-[8px]"></i> ${tx.status}</div>
                <div class="text-[8px] text-gray-500 font-mono mt-1">${tx.date}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    const mainBal = document.getElementById('main-balance'); if(mainBal) mainBal.innerText = b;
    const mobBal = document.getElementById('mobile-balance'); if(mobBal) mobBal.innerText = b;
    const walBal = document.getElementById('wallet-balance-display'); if(walBal) walBal.innerText = b;
    
    const dHash = document.getElementById('dash-hash'); if(dHash) dHash.innerText = gameState.hashrate.toLocaleString();
    const dDaily = document.getElementById('dash-daily'); if(dDaily) dDaily.innerText = (gameState.income * 86400).toFixed(2);
    const dInc = document.getElementById('dash-income'); if(dInc) dInc.innerText = gameState.income.toFixed(7);
    
    const totalDevices = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
    const dDev = document.getElementById('dash-devices'); if(dDev) dDev.innerText = totalDevices;
    
    const tonButtons = document.querySelectorAll('.btn-ton-check');
    tonButtons.forEach(btn => {
        const price = parseFloat(btn.getAttribute('data-price'));
        if(gameState.balance >= price) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    });
}

function processWithdraw() {
    const walletInput = document.getElementById('wallet-address');
    const amountInput = document.getElementById('withdraw-amount');
    
    if(!walletInput || !amountInput) return;

    const walletAddr = walletInput.value.trim();
    const val = parseFloat(amountInput.value);
    
    if(walletAddr.length < 5) { showToast("Invalid Wallet Address", 'error'); return; }
    if(!val || val <= 0) { showToast("Invalid Amount", 'error'); return; } 
    if(val < 0.5) { showToast("Min withdraw: 0.5 TON", 'error'); return; } 
    if(val > gameState.balance) { showToast("Insufficient Balance", 'error'); return; } 
    
    gameState.balance -= val;
    const newTx = { 
        id: Date.now(), amount: val, status: "Pending", date: new Date().toLocaleTimeString(), addr: walletAddr
    };
    gameState.history.unshift(newTx);
    amountInput.value = '';
    updateUI();
    renderHistory();
    saveGame();
    showToast("Withdrawal Request Sent", 'success');
}

let minLoop;
function startLoop() {
    clearInterval(minLoop);
    minLoop = setInterval(() => {
        if(gameState.hashrate > 0) {
            gameState.balance += (gameState.income / 10);
            updateUI();
            updateChart(gameState.hashrate);
        }
    }, 100);
}

// Chart.js
let chart;
function initChart() {
    const cvs = document.getElementById('miningChart');
    if(!cvs) return;
    
    if(window.myMiningChart) {
        window.myMiningChart.destroy();
    }

    const ctxChart = cvs.getContext('2d');
    let gradient = ctxChart.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.4)'); 
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
    
    chart = new Chart(ctxChart, {
        type: 'line',
        data: { 
            labels: Array(20).fill(''), 
            datasets: [{ 
                data: Array(20).fill(0), 
                borderColor: '#22d3ee', 
                backgroundColor: gradient, 
                borderWidth: 2, 
                tension: 0.4, 
                pointRadius: 0, 
                fill: true 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: false }, 
            scales: { x: { display: false }, y: { display: false } }, 
            animation: { duration: 0 },
            interaction: { intersect: false }
        }
    });
    window.myMiningChart = chart;
}

function updateChart(val) {
    if(!chart) return;
    const f = (Math.random() - 0.5) * (val * 0.05); 
    let v = val > 0 ? val + f : 0; 
    if(v<0) v=0;
    
    chart.data.datasets[0].data.push(v); 
    chart.data.datasets[0].data.shift(); 
    chart.update();
}

function initBg() {
    const cvs = document.getElementById('bg-canvas'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d');
    let w, h; const parts = [];
    
    function resize() { 
        w=window.innerWidth; h=window.innerHeight; 
        cvs.width=w; cvs.height=h; 
        parts.length=0; 
        const c=Math.min(Math.floor(w/15), 50); 
        for(let i=0;i<c;i++) parts.push({x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, s:Math.random()*2+.5}); 
    }
    window.addEventListener('resize', resize); 
    resize();
    
    function anim() { 
        ctx.clearRect(0,0,w,h); 
        for(let i=0;i<parts.length;i++) { 
            let p=parts[i]; 
            p.x+=p.vx; p.y+=p.vy; 
            if(p.x<0||p.x>w)p.vx*=-1; 
            if(p.y<0||p.y>h)p.vy*=-1; 
            
            ctx.beginPath(); 
            ctx.arc(p.x,p.y,p.s,0,Math.PI*2); 
            ctx.fillStyle=`rgba(34,211,238,${0.3+Math.random()*0.2})`; 
            ctx.fill(); 
        } 
        requestAnimationFrame(anim); 
    }
    anim();
}

// Global kullanıma aç
window.gameApp = {
    buyWithTON,
    buyWithStars,
    processWithdraw,
    closeModal,
    showPage
};
