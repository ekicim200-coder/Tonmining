// app.js

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

// Gelirleri hesapla
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

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Telegram Başlatma
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        try { tg.expand(); } catch(e){}
        
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            currentUserId = tg.initDataUnsafe.user.id.toString();
            console.log("Telegram User:", currentUserId);
        }
    }

    // 2. Oyunu Yükle
    await loadGame();
    
    // 3. Arayüzü Çiz
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    // 4. Döngüleri Başlat
    setInterval(() => saveGame(), 60000); // 60sn'de bir kaydet
    
    // window nesnesine fonksiyonları tanıttıktan sonra loop başlat
    if(gameState.hashrate > 0) {
        gameState.mining = true;
        activateSystem();
    }
});

// --- CORE FUNCTIONS ---

// Toast Mesajı Göster
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type} bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-700 flex items-center gap-3 mb-3 animate-bounce-in`;
    const icon = type === 'error' ? 'fa-triangle-exclamation text-red-500' : (type === 'star' ? 'fa-star text-yellow-400' : 'fa-circle-check text-green-400');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// KAYDETME FONKSİYONU
window.saveGame = async function() {
    gameState.lastLogin = Date.now();
    localStorage.setItem('nexusMinerV14', JSON.stringify(gameState));

    // Firebase'e Kayıt (Varsa)
    if (window.NexusFirebase) {
        try {
            const { db, setDoc, doc } = window.NexusFirebase;
            await setDoc(doc(db, "users", currentUserId), gameState);
            
            // Kaydedildi ikonu
            const ind = document.getElementById('save-indicator');
            if(ind) {
                ind.classList.remove('hidden');
                setTimeout(() => ind.classList.add('hidden'), 2000);
            }
        } catch (error) {
            console.error("Firebase Kayıt Hatası:", error);
        }
    }
}

// YÜKLEME FONKSİYONU
window.loadGame = async function() {
    let loadedData = null;

    // 1. Firebase'den Çekmeyi Dene
    if (window.NexusFirebase) {
        try {
            const { db, getDoc, doc } = window.NexusFirebase;
            const docSnap = await getDoc(doc(db, "users", currentUserId));
            if (docSnap.exists()) {
                loadedData = docSnap.data();
                console.log("Veri Buluttan Geldi!");
            }
        } catch (e) {
            console.warn("Bulut bağlantısı yok, yerel veri aranıyor...");
        }
    }

    // 2. Yerelden Çek
    if (!loadedData) {
        const local = localStorage.getItem('nexusMinerV14');
        if(local) try { loadedData = JSON.parse(local); } catch(e){}
    }

    // 3. Veriyi İşle
    if (loadedData) {
        gameState = { ...gameState, ...loadedData };
        if(!gameState.inventory) gameState.inventory = {};
        if(!gameState.history) gameState.history = [];

        recalcStats();
        checkOfflineEarnings();
        renderHistory();
        updateUI();
    }
}

// Çevrimdışı Kazanç Kontrolü
function checkOfflineEarnings() {
    if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
        const now = Date.now();
        const seconds = (now - gameState.lastLogin) / 1000;
        if (seconds > 10) {
            const earned = seconds * gameState.income;
            gameState.balance += earned;
            
            const m = document.getElementById('offline-modal');
            const a = document.getElementById('offline-amount');
            if(m && a) {
                a.innerText = earned.toFixed(7);
                m.classList.remove('hidden');
                m.style.display = 'flex';
            }
            saveGame();
        }
    }
}

window.closeModal = function() {
    const m = document.getElementById('offline-modal');
    if(m) { m.style.display = 'none'; m.classList.add('hidden'); }
}

function recalcStats() {
    let th = 0, inc = 0;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        th += p.hash * count;
        inc += p.income * count;
    });
    gameState.hashrate = th;
    gameState.income = inc;
}

function activateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind) { ind.classList.remove('bg-gray-500'); ind.classList.add('bg-green-500', 'animate-pulse'); }
    if(txt) { txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold"; }
    startLoop();
}

window.showPage = function(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('page-' + id);
    if(target) target.classList.add('active');

    // Navigasyon Güncelle
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const mob = document.getElementById('nav-' + id);
    if(mob) mob.classList.add('active');

    // Desktop Nav
    const deskIds = ['side-dashboard', 'side-market', 'side-inventory', 'side-wallet'];
    deskIds.forEach(did => {
        const el = document.getElementById(did);
        if(el) { 
            el.classList.remove('bg-white/10', 'text-cyan-400');
            const i = el.querySelector('i');
            if(i) i.className = i.className.replace('text-cyan-400', 'text-gray-400');
        }
    });
    const activeDesk = document.getElementById('side-' + id);
    if(activeDesk) {
        activeDesk.classList.add('bg-white/10', 'text-cyan-400');
        const i = activeDesk.querySelector('i');
        if(i) { i.classList.remove('text-gray-400'); i.classList.add('text-cyan-400'); }
    }

    if(id === 'inventory') renderInventory();
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        if(!gameState.inventory[p.id]) gameState.inventory[p.id] = 0;
        const daily = (p.income * 86400).toFixed(2);
        
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
                <div class="text-xs text-green-400 mt-1 font-bold">+${daily} TON / Day</div>
            </div>
            <div class="flex gap-2 mt-auto">
                <button onclick="window.buyWithTON(${p.id})" class="btn-ton-check w-1/2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-[10px] md:text-xs flex justify-center items-center gap-1 transition">
                    ${p.priceTON} TON
                </button>
                <button onclick="window.buyWithStars(${p.id})" class="w-1/2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-xl font-bold text-[10px] md:text-xs flex justify-center items-center gap-1 transition">
                    ${p.priceStars} <i class="fa-solid fa-star text-[10px]"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
    updateUI();
}

window.buyWithTON = function(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.priceTON) {
        gameState.balance -= p.priceTON;
        addMachine(id);
    } else {
        showToast("Yetersiz Bakiye!", 'error');
    }
}

window.buyWithStars = function(id) {
    showToast("Stars ödemesi yapılıyor...", 'star');
    setTimeout(() => addMachine(id), 1000);
}

function addMachine(id) {
    if(!gameState.inventory[id]) gameState.inventory[id] = 0;
    gameState.inventory[id]++;
    
    if(!gameState.mining) {
        gameState.mining = true;
        activateSystem();
    }
    
    const lbl = document.getElementById(`owned-${id}`);
    if(lbl) lbl.innerText = gameState.inventory[id];
    
    recalcStats();
    updateUI();
    saveGame();
    showToast("Cihaz Eklendi!", 'success');
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
                    <div class="text-xs text-gray-400">Toplam: <span class="text-white">${(p.hash * count).toLocaleString()} TH/s</span></div>
                </div>
                <div class="text-xl font-bold digit-font text-white bg-white/5 px-3 py-1 rounded-lg">x${count}</div>
            `;
            list.appendChild(div);
        }
    });
    if(empty) list.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-gray-500 py-10 italic">Depo boş. Markete git.</div>';
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(!gameState.history || gameState.history.length === 0) {
        list.innerHTML = `<div class="flex flex-col items-center justify-center h-40 text-gray-600 text-sm italic"><i class="fa-regular fa-file-lines text-2xl mb-2 opacity-50"></i> İşlem yok.</div>`;
        return;
    }

    gameState.history.forEach(tx => {
        const item = document.createElement('div');
        item.className = "bg-black/30 p-3 rounded-xl flex justify-between items-center border border-gray-700 mb-2";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><i class="fa-solid fa-clock"></i></div>
                <div>
                    <div class="text-[10px] text-gray-400">Çekim</div>
                    <div class="text-white font-bold digit-font text-sm">${tx.amount} TON</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-[10px] text-yellow-500 font-bold">${tx.status}</div>
                <div class="text-[8px] text-gray-500 font-mono">${tx.date}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    const els = ['main-balance', 'mobile-balance', 'wallet-balance-display'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = b;
    });

    const dHash = document.getElementById('dash-hash'); if(dHash) dHash.innerText = gameState.hashrate.toLocaleString();
    const dDaily = document.getElementById('dash-daily'); if(dDaily) dDaily.innerText = (gameState.income * 86400).toFixed(2);
    const dInc = document.getElementById('dash-income'); if(dInc) dInc.innerText = gameState.income.toFixed(7);
    const dDev = document.getElementById('dash-devices'); if(dDev) dDev.innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
}

window.processWithdraw = function() {
    const wAddr = document.getElementById('wallet-address').value;
    const wAmt = parseFloat(document.getElementById('withdraw-amount').value);
    
    if(wAddr.length < 5) return showToast("Geçersiz Cüzdan Adresi", 'error');
    if(!wAmt || wAmt <= 0) return showToast("Geçersiz Miktar", 'error');
    if(wAmt > gameState.balance) return showToast("Yetersiz Bakiye", 'error');
    
    gameState.balance -= wAmt;
    gameState.history.unshift({
        id: Date.now(), amount: wAmt, status: "Pending", date: new Date().toLocaleTimeString()
    });
    
    document.getElementById('withdraw-amount').value = '';
    updateUI();
    renderHistory();
    saveGame();
    showToast("Çekim talebi alındı", 'success');
}

// OYUN DÖNGÜSÜ
let loop;
function startLoop() {
    clearInterval(loop);
    loop = setInterval(() => {
        if(gameState.hashrate > 0) {
            gameState.balance += (gameState.income / 10);
            updateUI();
            updateChart(gameState.hashrate);
        }
    }, 100);
}

// Chart ve Arkaplan
let chart;
function initChart() {
    const ctx = document.getElementById('miningChart')?.getContext('2d');
    if(!ctx) return;
    if(chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                data: Array(20).fill(0),
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
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
            animation: { duration: 0 }
        }
    });
}

function updateChart(val) {
    if(!chart) return;
    const v = val + (Math.random()-0.5)*(val*0.05);
    chart.data.datasets[0].data.push(v > 0 ? v : 0);
    chart.data.datasets[0].data.shift();
    chart.update();
}

function initBg() {
    const cvs = document.getElementById('bg-canvas');
    if(!cvs) return;
    const ctx = cvs.getContext('2d');
    let w, h, parts = [];
    
    function resize() { 
        w=window.innerWidth; h=window.innerHeight; 
        cvs.width=w; cvs.height=h; 
        parts = [];
        const c = Math.min(Math.floor(w/20), 40);
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

// "window.gameApp" yapısına ihtiyaç duyan HTML varsa diye
window.gameApp = {
    buyWithTON: window.buyWithTON,
    buyWithStars: window.buyWithStars,
    processWithdraw: window.processWithdraw,
    closeModal: window.closeModal,
    showPage: window.showPage
};
