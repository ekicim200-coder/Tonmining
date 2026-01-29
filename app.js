// --- CONFIGURATION ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node", price: 10, hash: 5, icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "GTX 1660 Rig", price: 120, hash: 85, icon: "fa-memory", color: "text-green-400" },
    { id: 3, name: "RTX 4090 Farm", price: 950, hash: 650, icon: "fa-server", color: "text-cyan-400" },
    { id: 4, name: "Quantum ASIC", price: 4500, hash: 4200, icon: "fa-industry", color: "text-purple-500" },
    { id: 5, name: "AI Cluster", price: 15000, hash: 18000, icon: "fa-brain", color: "text-red-500" },
    { id: 6, name: "Orbital Satellite", price: 75000, hash: 85000, icon: "fa-satellite", color: "text-blue-400" },
    { id: 7, name: "Fusion Reactor", price: 350000, hash: 450000, icon: "fa-atom", color: "text-yellow-400" },
    { id: 8, name: "Dark Matter Node", price: 2000000, hash: 3500000, icon: "fa-dna", color: "text-pink-500" }
];

// Calculate Income
products.forEach(p => { p.income = p.price / (ROI_DAYS * SECONDS_IN_DAY); });

// Game State
let gameState = {
    balance: 10.0000000,
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: []
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    // Event Listeners
    document.getElementById('toggleMining').addEventListener('click', toggleMining);
    document.getElementById('btn-withdraw').addEventListener('click', processWithdraw);
    
    // Auto-Save Loop
    setInterval(() => { if(gameState.mining) saveGame(); }, 10000);
});

// --- LOCAL STORAGE ---
function saveGame() {
    localStorage.setItem('nexusMinerSave', JSON.stringify(gameState));
    const ind = document.getElementById('save-indicator');
    if(ind) {
        ind.style.opacity = '1';
        setTimeout(() => { ind.style.opacity = '0'; }, 1000);
    }
}

function loadGame() {
    const saved = localStorage.getItem('nexusMinerSave');
    if(saved) {
        const parsed = JSON.parse(saved);
        gameState.balance = parsed.balance || 10.0000000;
        gameState.inventory = parsed.inventory || {};
        gameState.history = parsed.history || [];
        recalcStats();
        renderHistory();
        updateUI();
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

// --- NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const mob = document.getElementById('nav-' + pageId);
    if(mob) mob.classList.add('active');

    const deskIds = ['side-dashboard', 'side-market', 'side-inventory', 'side-wallet'];
    deskIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.remove('bg-white/10');
            const icon = el.querySelector('i');
            if(icon) icon.classList.remove('text-cyan-400');
        }
    });
    const activeDesk = document.getElementById('side-' + pageId);
    if(activeDesk) {
        activeDesk.classList.add('bg-white/10');
        activeDesk.querySelector('i').classList.add('text-cyan-400');
    }
    if(pageId === 'inventory') renderInventory();
}

// --- UI RENDERING ---
function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        if(!gameState.inventory[p.id]) gameState.inventory[p.id] = 0;
        const dailyInc = (p.income * 86400).toFixed(2);
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl flex flex-col justify-between group hover:-translate-y-2 transition duration-300 border border-gray-800 hover:border-cyan-500/50";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-4 bg-black/40 rounded-xl ${p.color} text-2xl shadow-inner border border-white/5"><i class="fa-solid ${p.icon}"></i></div>
                <div class="text-xs bg-gray-900 px-3 py-1 rounded-full text-gray-400 border border-gray-700">Owned: ${gameState.inventory[p.id]}</div>
            </div>
            <div class="mb-4">
                <h3 class="font-bold text-lg text-white">${p.name}</h3>
                <div class="flex items-center gap-3 mt-2 text-xs"><span class="text-gray-400"><i class="fa-solid fa-bolt text-yellow-500"></i> ${(p.hash >= 1000 ? (p.hash/1000).toFixed(1) + 'k' : p.hash)} TH/s</span></div>
                <div class="text-xs text-green-400 mt-1 font-bold">+${dailyInc} TON / Day</div>
            </div>
            <button onclick="window.gameApp.buyProduct(${p.id})" class="buy-btn w-full btn-glow py-3 rounded-xl font-bold text-sm uppercase tracking-wider" data-price="${p.price}">${p.price.toLocaleString()} TON</button>
        `;
        list.appendChild(div);
    });
    updateUI();
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
    if(empty) list.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-10 italic">Warehouse empty.</div>';
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
        const item = document.createElement('div');
        item.className = "bg-black/30 p-4 rounded-xl flex justify-between items-center border border-gray-700 hover:border-gray-500 transition";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><i class="fa-solid fa-clock"></i></div>
                <div>
                    <div class="text-xs text-gray-400">Withdrawal</div>
                    <div class="text-white font-bold digit-font">${tx.amount.toFixed(2)} TON</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-xs text-pending font-bold flex items-center justify-end gap-1"><i class="fa-solid fa-circle-notch fa-spin text-[10px]"></i> ${tx.status}</div>
                <div class="text-[10px] text-gray-500 font-mono mt-1">${tx.date}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    document.getElementById('main-balance').innerText = b + " TON";
    document.getElementById('mobile-balance').innerText = b;
    document.getElementById('wallet-balance-display').innerText = b;
    document.getElementById('dash-hash').innerText = gameState.hashrate.toLocaleString();
    document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
    document.getElementById('dash-income').innerText = gameState.income.toFixed(7);
    document.getElementById('dash-devices').innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
    
    // Update Buy Buttons
    const buttons = document.querySelectorAll('.buy-btn');
    buttons.forEach(btn => {
        const price = parseFloat(btn.getAttribute('data-price'));
        if(gameState.balance >= price) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'grayscale');
        } else {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'grayscale');
        }
    });
}

// --- ACTIONS ---
function buyProduct(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.price) {
        gameState.balance -= p.price;
        gameState.inventory[id]++;
        recalcStats();
        updateUI();
        renderMarket();
        saveGame();
    }
}

function processWithdraw() {
    const inp = document.getElementById('withdraw-amount');
    const sts = document.getElementById('withdraw-status');
    const val = parseFloat(inp.value);
    
    if(!val || val <= 0) {
        sts.innerHTML = '<span class="text-red-400">Invalid Amount</span>';
    } else if(val < 50) {
        sts.innerHTML = '<span class="text-red-400">Minimum withdrawal is 50.00 TON</span>';
    } else if(val > gameState.balance) {
        sts.innerHTML = '<span class="text-red-400">Insufficient Balance</span>';
    } else {
        gameState.balance -= val;
        const newTx = { id: Date.now(), amount: val, status: "Pending", date: new Date().toLocaleTimeString() };
        gameState.history.unshift(newTx);
        inp.value = '';
        updateUI();
        renderHistory();
        saveGame();
        sts.innerHTML = '<span class="text-green-400">Request Submitted</span>';
        setTimeout(() => { sts.innerHTML = ''; }, 3000);
    }
}

// --- MINING LOOP ---
let minLoop;
function toggleMining() {
    const btn = document.getElementById('toggleMining');
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    const pulseTarget = document.getElementById('dash-hash').parentElement.parentElement;

    if(!gameState.mining) {
        if(gameState.income <= 0) return alert("System Alert: Hash power is 0. Buy a rig first.");
        gameState.mining = true;
        btn.classList.remove('btn-start'); btn.classList.add('btn-stop');
        span.innerText = "STOP SYSTEM"; icon.className = "fa-solid fa-square";
        pulseTarget.classList.add('pulse-active');
        
        minLoop = setInterval(() => {
            gameState.balance += (gameState.income / 10);
            updateUI();
            updateChart(gameState.hashrate);
        }, 100);
    } else {
        gameState.mining = false;
        clearInterval(minLoop);
        btn.classList.remove('btn-stop'); btn.classList.add('btn-start');
        span.innerText = "START SYSTEM"; icon.className = "fa-solid fa-power-off";
        pulseTarget.classList.remove('pulse-active');
    }
}

// --- VISUALS (Chart & BG) ---
let chart;
function initChart() {
    const ctxChart = document.getElementById('miningChart').getContext('2d');
    let gradient = ctxChart.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 242, 255, 0.4)'); gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');
    
    chart = new Chart(ctxChart, {
        type: 'line',
        data: { labels: Array(20).fill(''), datasets: [{ data: Array(20).fill(0), borderColor: '#00f2ff', backgroundColor: gradient, borderWidth: 3, tension: 0.4, pointRadius: 0, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } }, animation: { duration: 0 } }
    });
}

function updateChart(val) {
    const f = (Math.random() - 0.5) * (val * 0.15); let v = val > 0 ? val + f : 0; if(v<0) v=0;
    chart.data.datasets[0].data.push(v); chart.data.datasets[0].data.shift(); chart.update();
}

function initBg() {
    const cvs = document.getElementById('bg-canvas'); 
    const ctx = cvs.getContext('2d');
    let w, h; const parts = [];
    function resize() { w=window.innerWidth; h=window.innerHeight; cvs.width=w; cvs.height=h; parts.length=0; const c=Math.min(Math.floor(w/15),100); for(let i=0;i<c;i++) parts.push({x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, s:Math.random()*2+.5}); }
    window.addEventListener('resize', resize); resize();
    function anim() { ctx.clearRect(0,0,w,h); for(let i=0;i<parts.length;i++) { let p=parts[i]; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fillStyle=`rgba(0,242,255,${0.3+Math.random()*0.2})`; ctx.fill(); for(let j=i+1;j<parts.length;j++) { let p2=parts[j]; let d=Math.hypot(p.x-p2.x,p.y-p2.y); if(d<120) { ctx.beginPath(); ctx.strokeStyle=`rgba(0,242,255,${1-d/120})`; ctx.lineWidth=0.5; ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); } } } requestAnimationFrame(anim); }
    anim();
}

// Expose functions to window for HTML onClick attributes
window.gameApp = {
    showPage,
    buyProduct
};
