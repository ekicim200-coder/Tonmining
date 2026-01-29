// app.js
const ROI_DAYS = 15;
const SEC_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node", price: 10, hash: 100, income: 10 / (ROI_DAYS * SEC_DAY) },
    { id: 2, name: "Micro Rig", price: 30, hash: 300, income: 30 / (ROI_DAYS * SEC_DAY) },
    { id: 3, name: "GTX Cluster", price: 60, hash: 600, income: 60 / (ROI_DAYS * SEC_DAY) }
];

let gameState = { balance: 10, inventory: {}, hashrate: 0, income: 0, lastLogin: Date.now() };
let currentUserUID = null;
let isLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
    if(window.Telegram?.WebApp) window.Telegram.WebApp.expand();
    
    // UI Init
    renderMarket();
    initChart();
    
    // Auth Listener
    window.auth.onAuthStateChanged(user => {
        if(user) {
            currentUserUID = user.uid;
            syncData();
        } else {
            window.auth.signInAnonymously();
        }
    });
});

function syncData() {
    window.db.collection("users").doc(currentUserUID).onSnapshot(doc => {
        if(doc.exists) {
            gameState = doc.data();
            if(!isLoaded) { startMining(); isLoaded = true; }
        } else {
            save(); // İlk kayıt
        }
        updateUI();
        document.getElementById('status-indicator').className = "w-2 h-2 rounded-full bg-green-500 animate-pulse";
        document.getElementById('status-text').innerText = "ONLINE";
    }, err => {
        console.error("Firestore Error:", err);
        document.getElementById('status-text').innerText = "DB ERROR";
    });
}

function save() {
    if(!currentUserUID) return;
    gameState.lastLogin = Date.now();
    window.db.collection("users").doc(currentUserUID).set(gameState, { merge: true });
}

function startMining() {
    setInterval(() => {
        if(gameState.income > 0) {
            gameState.balance += (gameState.income / 10);
            updateUI();
        }
    }, 100);
    setInterval(save, 30000); // 30 sn bir buluta yedekle
}

window.gameApp = {
    buyWithTON: (id) => {
        const p = products.find(x => x.id === id);
        if(gameState.balance >= p.price) {
            gameState.balance -= p.price;
            gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
            gameState.hashrate += p.hash;
            gameState.income += p.income;
            save();
            showToast(`Success: ${p.name} acquired!`);
        } else {
            showToast("Error: Insufficient balance!");
        }
    },
    showPage: (id) => {
        document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + id).classList.remove('hidden');
    },
    processWithdraw: () => {
        const addr = document.getElementById('wallet-address').value;
        const amt = parseFloat(document.getElementById('withdraw-amount').value);
        if(!addr || amt < 50) return showToast("Min 50 TON & Valid Addr Required");
        if(amt > gameState.balance) return showToast("Insufficient Funds");
        gameState.balance -= amt;
        save();
        showToast("Withdrawal Requested!");
    }
};

function updateUI() {
    document.getElementById('main-balance').innerText = gameState.balance.toFixed(7);
    document.getElementById('dash-hash').innerText = gameState.hashrate;
    document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if(!list) return;
    list.innerHTML = '';
    products.forEach(p => {
        list.innerHTML += `
            <div class="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-gray-800">
                <div>
                    <h3 class="font-bold text-lg text-white">${p.name}</h3>
                    <div class="text-xs text-cyan-400 mt-1">${p.hash} TH/s</div>
                </div>
                <button onclick="window.gameApp.buyWithTON(${p.id})" class="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 py-3 rounded-xl mt-4 font-bold hover:bg-blue-600 hover:text-white transition">
                    ${p.price} TON
                </button>
            </div>`;
    });
}

function showToast(m) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = "bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl text-white text-sm mb-2";
    t.innerText = m;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function initChart() { /* Chart.js ayarları buraya... */ }
