// --- IMPORT ---
import { saveUserToFire, getUserFromFire, initAuth, saveWithdrawalRequest } from './firebase-config.js';
import { isTelegramAvailable, createTelegramInvoice, applyTelegramTheme, getTelegramUserId } from './telegram-integration.js';

// --- AYARLAR ---
const CFG = { rate: 0.000001, tick: 100 };
const ADMIN_WALLET = "UQBfQpD5TFm0DlMkqZBymxBh9Uiyj1sqvdzkEvpgrgwS6gCc";

let tonConnectUI;
let currentUserUid = null;

let state = { 
    balance: 1.00, 
    hashrate: 0, 
    inv: [], 
    wallet: null,
    lastSave: Date.now(),
    freeEnd: 0 
};

const machines = [
    { id: 1, name: "Starter CPU", price: 10, rate: 5, color: "#94a3b8", icon: "fa-microchip" },
    { id: 2, name: "GTX 1660", price: 30, rate: 15, color: "#2dd4bf", icon: "fa-memory" },
    { id: 3, name: "RTX 3060", price: 75, rate: 40, color: "#3b82f6", icon: "fa-gamepad" },
    { id: 4, name: "RTX 4090", price: 150, rate: 90, color: "#8b5cf6", icon: "fa-rocket" },
    { id: 5, name: "ASIC Miner", price: 400, rate: 250, color: "#f472b6", icon: "fa-server" },
    { id: 999, name: "FREE ASIC", price: 0, rate: 300, color: "#ef4444", icon: "fa-server" }
];

let graphData = new Array(20).fill(10);

// --- INIT ---
function init() {
    console.log("🚀 App başlatılıyor...");
    
    if (isTelegramAvailable()) {
        console.log("📱 Telegram Mini App algılandı!");
        applyTelegramTheme();
    }
    
    initAuth((uid) => {
        currentUserUid = uid;
        console.log("✅ Firebase Auth hazır. User:", uid);
    });

    loadLocalData();
    calculateOfflineProgress();
    renderMarket();
    updateUI();
    
    // TON Connect'i bekle
    setTimeout(() => {
        setupTonConnect();
    }, 1000);

    setInterval(loop, CFG.tick); 
    setInterval(autoSave, 10000); 
    setInterval(graphLoop, 1000);
    setInterval(termLoop, 2000);
    setInterval(checkFree, 1000);
}

// --- TON CONNECT (MINIMAL) ---
function setupTonConnect() {
    console.log("🔧 TON Connect başlatılıyor...");
    
    if (typeof TON_CONNECT_UI === 'undefined') {
        console.error("❌ TON Connect SDK yüklenmedi!");
        setTimeout(setupTonConnect, 2000);
        return;
    }
    
    console.log("✅ SDK Version:", TON_CONNECT_UI.SDK_VERSION);
    
    try {
        // MİNİMAL KONFIGÜRASYON - HİÇBİR ÖZEL AYAR YOK
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://tonmining.vercel.app/tonconnect-manifest.json'
        });

        console.log("✅ TON Connect UI oluşturuldu");

        // Wallet durumunu izle
        const unsubscribe = tonConnectUI.onStatusChange((walletInfo) => {
            console.log("🔄 Wallet durumu:", walletInfo ? "CONNECTED" : "DISCONNECTED");
            
            if (walletInfo) {
                const address = walletInfo.account.address;
                const friendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(address);
                state.wallet = friendlyAddress;
                
                document.getElementById('w-addr').value = friendlyAddress;
                document.getElementById('w-addr').disabled = false;
                
                showToast("✅ Wallet Connected!");
                loadServerData(friendlyAddress);
            } else {
                state.wallet = null;
                document.getElementById('w-addr').value = "";
                document.getElementById('w-addr').disabled = true;
            }
        });
        
        console.log("✅ Listener bağlandı");
        
    } catch (error) {
        console.error("❌ TON Connect hatası:", error);
        showToast("Connection error", true);
    }
}

// --- DATA MANAGEMENT ---
function loadLocalData() {
    const saved = localStorage.getItem('tonMinerSave');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            state.wallet = null;
        } catch (e) { 
            console.error("Save bozuk"); 
        }
    }
}

function saveLocalData() {
    state.lastSave = Date.now();
    localStorage.setItem('tonMinerSave', JSON.stringify(state));
}

function autoSave() {
    saveLocalData();
}

async function syncToServer() {
    if (!state.wallet || !currentUserUid) return;
    
    const dataToSave = {
        balance: state.balance,
        hashrate: state.hashrate,
        inv: state.inv,
        freeEnd: state.freeEnd
    };
    await saveUserToFire(state.wallet, dataToSave);
}

async function loadServerData(walletAddress) {
    showToast("Syncing...", false);
    
    let attempts = 0;
    while (!currentUserUid && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!currentUserUid) {
        showToast("Auth not ready", true);
        return;
    }
    
    const serverData = await getUserFromFire(walletAddress);

    if (serverData) {
        state.balance = serverData.balance || state.balance;
        state.hashrate = serverData.hashrate || 0;
        state.inv = serverData.inv || [];
        state.freeEnd = serverData.freeEnd || 0;
        state.lastSave = serverData.lastSave || Date.now();
        
        calculateOfflineProgress();
        updateUI();
        drawChart();
        saveLocalData();
        showToast("✅ Synced");
    } else {
        syncToServer();
    }
}

function calculateOfflineProgress() {
    if (!state.lastSave || state.hashrate === 0) return;
    const now = Date.now();
    const secondsPassed = (now - state.lastSave) / 1000;
    
    if (secondsPassed > 5) {
        const earned = secondsPassed * state.hashrate * CFG.rate;
        if (earned > 0) {
            state.balance += earned;
            showToast(`Offline: +${earned.toFixed(4)} TON`);
            syncToServer();
        }
    }
}

// --- ACTIONS ---
async function buy(id) {
    const m = machines.find(x => x.id === id);
    if (!m) return;

    if (m.price === 0) {
        grantMachine(id);
        return;
    }

    if (isTelegramAvailable()) {
        const success = await createTelegramInvoice(m.price, m.name, `TON Miner: ${m.name}`);
        if (success) {
            state.balance -= m.price;
            state.inv.push({ mid: id, uid: Date.now() });
            state.hashrate += m.rate;
            updateUI(); 
            drawChart();
            saveLocalData();
            syncToServer();
            showToast(`${m.name} Purchased!`);
        }
        return;
    }

    if (!state.wallet) {
        showToast("Connect wallet first", true);
        return;
    }

    if (state.balance < m.price) {
        showToast("Insufficient balance", true);
        return;
    }

    if (!confirm(`Buy ${m.name} for ${m.price} TON?`)) return;

    try {
        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: ADMIN_WALLET,
                amount: (m.price * 1e9).toString()
            }]
        };

        await tonConnectUI.sendTransaction(tx);

        state.balance -= m.price;
        state.inv.push({ mid: id, uid: Date.now() });
        state.hashrate += m.rate;
        updateUI(); 
        drawChart();
        saveLocalData();
        syncToServer();
        showToast(`${m.name} Purchased!`);
    } catch (e) {
        showToast("Transaction failed", true);
        console.error(e);
    }
}

async function withdraw() {
    const addr = document.getElementById('w-addr').value.trim();
    const amtInput = document.getElementById('w-amt');
    const amt = parseFloat(amtInput.value);

    if (!addr || !amt || amt <= 0) {
        showToast("Invalid input", true);
        return;
    }

    if (amt > state.balance) {
        showToast("Insufficient balance", true);
        return;
    }

    if (amt < 1) {
        showToast("Minimum 1 TON", true);
        return;
    }

    if (!confirm(`Withdraw ${amt} TON?`)) return;

    try {
        const success = await saveWithdrawalRequest(addr, amt);

        if (success) {
            state.balance -= amt;
            updateUI();
            saveLocalData();
            syncToServer();
            showToast("✅ Request submitted!");
            amtInput.value = "";
        } else {
            showToast("Request failed", true);
        }
    } catch (e) {
        showToast("Error", true);
        console.error(e);
    }
}

function checkFree() {
    if (state.freeEnd > Date.now()) return;
    state.inv = state.inv.filter(i => i.mid !== 999);
    const old = state.hashrate;
    state.hashrate = state.inv.reduce((s, i) => {
        return s + (machines.find(m => m.id === i.mid)?.rate || 0);
    }, 0);
    if (old !== state.hashrate) {
        updateUI(); 
        drawChart(); 
        saveLocalData(); 
        syncToServer();
    }
}

function grantMachine(id) {
    state.inv.push({ mid: id, uid: Date.now() });
    state.hashrate += machines.find(m => m.id === id).rate;
    state.freeEnd = Date.now() + 3 * 3600 * 1000;
    updateUI();
    drawChart();
    saveLocalData();
    syncToServer();
    showToast("Machine granted for 3h!");
}

async function watchAd() {
    showToast("Ad loading...");
    
    setTimeout(() => {
        const bonus = Math.random() * 0.5 + 0.1;
        state.balance += bonus;
        updateUI();
        saveLocalData();
        syncToServer();
        showToast(`+${bonus.toFixed(4)} TON!`);
    }, 2000);
}

// --- LOOP & UI ---
function loop() {
    if(state.hashrate > 0) {
        state.balance += state.hashrate * CFG.rate;
        document.getElementById('totalBal').innerText = state.balance.toFixed(4);
    }
}

function updateUI() {
    document.getElementById('totalBal').innerText = state.balance.toFixed(4);
    document.getElementById('d-hash').innerText = state.hashrate;
    document.getElementById('d-count').innerText = state.inv.length;
    const daily = state.hashrate * CFG.rate * 86400;
    document.getElementById('d-daily').innerText = daily.toFixed(2);
}

function go(id, el) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('v-'+id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    if(id==='dash') drawChart();
    if(id==='inv') renderInv();
}

function drawChart() {
    const svg = document.getElementById('chartSegments');
    svg.innerHTML = "";
    if(state.hashrate === 0) return;
    let groups = {};
    state.inv.forEach(i => {
        let m = machines.find(x => x.id === i.mid);
        if(!groups[m.id]) groups[m.id] = { ...m, count:0, total:0 };
        groups[m.id].count++; 
        groups[m.id].total += m.rate;
    });
    let r=40, circ=2*Math.PI*r, off=0;
    Object.values(groups).forEach(g => {
        let pct = g.total / state.hashrate;
        let len = circ * pct;
        let c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", 50); 
        c.setAttribute("cy", 50); 
        c.setAttribute("r", r);
        c.setAttribute("class", "c-seg");
        c.setAttribute("stroke", g.color);
        c.setAttribute("stroke-dasharray", `${len} ${circ}`);
        c.setAttribute("stroke-dashoffset", -off);
        svg.appendChild(c);
        off += len;
    });
}

function graphLoop() {
    if(state.hashrate === 0) return;
    let noise = (Math.random()-0.5) * (state.hashrate*0.1);
    graphData.push(state.hashrate + noise);
    graphData.shift();
    let max = Math.max(...graphData, state.hashrate*1.2);
    let min = Math.min(...graphData, state.hashrate*0.8);
    let pts = "";
    graphData.forEach((v,i) => {
        let x = i * (100/19);
        let y = 20 - ((v-min)/(max-min || 1)*18 + 1);
        pts += `${x},${y} `;
    });
    document.getElementById('liveLine').setAttribute('points', pts);
}

function termLoop() {
    if(state.hashrate > 0) {
        const msgs = ["Hash Verified", "Block Sync OK", "Fan: 65%", "Share Accepted"];
        log(msgs[Math.floor(Math.random()*msgs.length)]);
    }
}

function log(msg) {
    const d = new Date().toLocaleTimeString().split(" ")[0];
    const box = document.getElementById('termLogs');
    box.innerHTML += `<div class="log-line"><span style="color:#666">[${d}]</span> > ${msg}</div>`;
    box.scrollTop = box.scrollHeight;
}

function renderMarket() {
    const l = document.getElementById('marketList'); 
    l.innerHTML = "";
    machines.filter(m=>m.id!==999).forEach(m => {
        let daily = (m.rate * CFG.rate * 86400).toFixed(2);
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info"><h4>${m.name}</h4><p>+${m.rate} GH/s • Day: ${daily}</p></div>
            <div class="ci-action"><span class="ci-price">${m.price} TON</span><button id="btn-${m.id}" class="action-btn" data-machine-id="${m.id}">BUY</button></div>
        </div>`;
    });
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const machineId = parseInt(this.getAttribute('data-machine-id'));
            buy(machineId);
        });
    });
}

function renderInv() {
    const l = document.getElementById('invList'); 
    l.innerHTML = "";
    if(state.inv.length===0) l.innerHTML = "<div style='text-align:center; color:#666'>Empty</div>";
    state.inv.slice().reverse().forEach(i => {
        let m = machines.find(x => x.id === i.mid);
        let isFree = m.id===999;
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info"><h4>${m.name}</h4><p>${isFree?'Limited':'Unlimited'}</p></div>
            <div class="ci-action" style="color:${isFree?'var(--danger)':'var(--success)'}; font-weight:bold; font-size:0.8rem;">${isFree?'FREE':'ACTIVE'}</div>
        </div>`;
    });
}

function showToast(msg, err=false) {
    const t = document.getElementById('toast');
    t.innerText = msg; 
    t.style.display="block";
    t.style.border = err ? "1px solid #ff453a" : "1px solid #10b981";
    t.style.color = err ? "#ff453a" : "#10b981";
    setTimeout(()=>t.style.display="none", 2000);
}

// --- GLOBAL ---
window.buy = buy;
window.withdraw = withdraw;
window.go = go;
window.watchAd = watchAd;

// --- DOM LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready');
    
    const withdrawBtn = document.querySelector('.w-btn');
    if (withdrawBtn) withdrawBtn.addEventListener('click', withdraw);
    
    const adBtn = document.querySelector('.ad-btn');
    if (adBtn) adBtn.addEventListener('click', watchAd);
    
    document.querySelectorAll('.nav-item').forEach((navItem, index) => {
        navItem.addEventListener('click', function() {
            const views = ['dash', 'market', 'inv', 'wallet'];
            go(views[index], this);
        });
    });
});

// INIT
init();
