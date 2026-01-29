// --- CONFIGURATION ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

// PRICES: priceTON (In-Game Balance), priceStars (External Payment - Display Only)
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

let gameState = {
    balance: 10.0000000, // TON only
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: [],
    lastLogin: Date.now()
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand(); 

    loadGame();
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();

    document.getElementById('btn-withdraw').addEventListener('click', processWithdraw);
    setInterval(() => { saveGame(); }, 60000);
    window.addEventListener('beforeunload', () => { saveGame(); });
});

// --- TOAST ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'star' ? 'fa-star' : 'fa-circle-check');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// --- CORE FUNCTIONS ---
function saveGame() {
    gameState.lastLogin = Date.now();
    localStorage.setItem('nexusMinerV14', JSON.stringify(gameState));
    const ind = document.getElementById('save-indicator');
    ind.style.opacity = '1'; setTimeout(() => { ind.style.opacity = '0'; }, 2000);
}

function loadGame() {
    const saved = localStorage.getItem('nexusMinerV14');
    if(saved) {
        const parsed = JSON.parse(saved);
        gameState = { ...gameState, ...parsed };
        recalcStats();
        
        // OFFLINE EARNINGS
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
}

function closeModal() { document.getElementById('offline-modal').style.display = 'none'; }

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
    ind.classList.remove('bg-gray-500'); ind.classList.add('bg-green-500', 'animate-pulse');
    txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold";
    document.getElementById('dash-hash').parentElement.parentElement.classList.add('pulse-active');
    startLoop();
}

function deactivateSystem() {
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    ind.classList.remove('bg-green-500', 'animate-pulse'); ind.classList.add('bg-gray-500');
    txt.innerText = "STANDBY"; txt.className = "text-gray-500 font-bold";
    document.getElementById('dash-hash').parentElement.parentElement.classList.remove('pulse-active');
    clearInterval(minLoop);
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const mob = document.getElementById('nav-' + pageId);
    if(mob) mob.classList.add('active');
    const deskIds = ['side-dashboard', 'side-market', 'side-inventory', 'side-wallet'];
    deskIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.classList.remove('bg-white/10'); el.querySelector('i').classList.remove('text-cyan-400'); el.querySelector('i').classList.remove('text-yellow-400'); }
    });
    const activeDesk = document.getElementById('side-' + pageId);
    if(activeDesk) {
        activeDesk.classList.add('bg-white/10');
        if(pageId === 'market') activeDesk.querySelector('i').classList.add('text-yellow-400');
        else activeDesk.querySelector('i').classList.add('text-cyan-400');
    }
    if(pageId === 'inventory') renderInventory();
}

function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = '';
    products.forEach(p => {
        if(!gameState.inventory[p.id]) gameState.inventory[p.id] = 0;
        const dailyInc = (p.income * 86400).toFixed(2);
        
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl flex flex-col justify-between transition border border-gray-800 hover:border-cyan-500/50";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-4 bg-black/40 rounded-xl ${p.color} text-2xl shadow-inner border border-white/5"><i class="fa-solid ${p.icon}"></i></div>
                <div class="text-xs bg-gray-900 px-3 py-1 rounded-full text-gray-400 border border-gray-700">Owned: ${gameState.inventory[p.id]}</div>
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
        `;
        list.appendChild(div);
    });
    updateUI();
}

// --- BUY LOGIC ---
function buyWithTON(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.priceTON) {
        gameState.balance -= p.priceTON;
        addMachine(id, "Bought with TON");
    } else {
        showToast("Insufficient TON Balance", 'error');
    }
}

function buyWithStars(id) {
    // SIMULATED FAILURE: Logic requirement "Absolutely do not buy"
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    btn.disabled = true;

    setTimeout(() => {
        showToast("⚠️ Star Purchase Disabled in Simulation", 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }, 1000); 
}

function addMachine(id, source) {
    const p = products.find(x => x.id === id);
    gameState.inventory[id]++;
    
    if(!gameState.mining) {
        gameState.mining = true;
        activateSystem();
        showToast("System Auto-Started!", 'success');
    } else {
        if(source.includes("TON")) showToast(`Purchased ${p.name}!`, 'success');
    }

    recalcStats();
    updateUI();
    renderMarket();
    saveGame();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
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
    if(gameState.history.length === 0) { list.innerHTML = '<div class="text-center text-gray-500 text-sm py-10 italic">No transaction history found.</div>'; return; }
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
                <div class="text-[9px] text-cyan-500 font-mono truncate max-w-[80px] ml-auto">${tx.addr}</div>
            </div>
        `;
        list.appendChild(item);
    });
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    document.getElementById('main-balance').innerText = b + " TON";
    document.getElementById('mobile-balance').innerText = b; // FIXED: Full precision on mobile
    document.getElementById('wallet-balance-display').innerText = b;
    document.getElementById('dash-hash').innerText = gameState.hashrate.toLocaleString();
    document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
    document.getElementById('dash-income').innerText = gameState.income.toFixed(7);
    document.getElementById('dash-devices').innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
    
    // Check TON balance for buttons
    const tonButtons = document.querySelectorAll('.btn-ton-check');
    tonButtons.forEach(btn => {
        const price = parseFloat(btn.getAttribute('data-price'));
        if(gameState.balance >= price) btn.disabled = false; else btn.disabled = true;
    });
}

function processWithdraw() {
    const walletInput = document.getElementById('wallet-address');
    const amountInput = document.getElementById('withdraw-amount');
    const walletAddr = walletInput.value.trim();
    const val = parseFloat(amountInput.value);
    
    if(walletAddr.length < 5) { showToast("Invalid Wallet Address", 'error'); return; }
    if(!val || val <= 0) { showToast("Invalid Amount", 'error'); return; } 
    if(val < 50) { showToast("Min withdraw: 50 TON", 'error'); return; } 
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
        gameState.balance += (gameState.income / 10);
        updateUI();
        updateChart(gameState.hashrate);
    }, 100);
}

// --- VISUALS ---
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
    const cvs = document.getElementById('bg-canvas'); const ctx = cvs.getContext('2d');
    let w, h; const parts = [];
    function resize() { w=window.innerWidth; h=window.innerHeight; cvs.width=w; cvs.height=h; parts.length=0; const c=Math.min(Math.floor(w/15),100); for(let i=0;i<c;i++) parts.push({x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, s:Math.random()*2+.5}); }
    window.addEventListener('resize', resize); resize();
    function anim() { ctx.clearRect(0,0,w,h); for(let i=0;i<parts.length;i++) { let p=parts[i]; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fillStyle=`rgba(0,242,255,${0.3+Math.random()*0.2})`; ctx.fill(); for(let j=i+1;j<parts.length;j++) { let p2=parts[j]; let d=Math.hypot(p.x-p2.x,p.y-p2.y); if(d<120) { ctx.beginPath(); ctx.strokeStyle=`rgba(0,242,255,${1-d/120})`; ctx.lineWidth=0.5; ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); } } } requestAnimationFrame(anim); }
    anim();
}

// Expose functions
window.gameApp = {
    buyWithTON,
    buyWithStars,
    processWithdraw,
    closeModal,
    showPage
};
