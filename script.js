// --- IMPORT ---
// initAuth fonksiyonunu da import ettik
import { saveUserToFire, getUserFromFire, initAuth } from './firebase-config.js';

// --- AYARLAR ---
const CFG = { rate: 0.000001, tick: 100 };
const ADMIN_WALLET = "UQA_......................................."; // SENİN CÜZDANIN

let tonConnectUI;
let currentUserUid = null; // Firebase User ID'sini burada tutacağız

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

function init() {
    // 1. Önce Anonim Girişi Başlat
    initAuth((uid) => {
        currentUserUid = uid;
        console.log("Sistem Hazır. User:", uid);
        // Giriş başarılı olunca diğer işlemleri yapabiliriz (gerekirse)
    });

    loadLocalData();
    calculateOfflineProgress();

    renderMarket();
    updateUI();
    
    setupTonConnect();

    setInterval(loop, CFG.tick); 
    setInterval(autoSave, 10000); 
    setInterval(graphLoop, 1000);
    setInterval(termLoop, 2000);
    setInterval(checkFree, 1000);
}

// --- DATA MANAGEMENT ---

function loadLocalData() {
    const saved = localStorage.getItem('tonMinerSave');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            state.wallet = null; 
        } catch (e) { console.error("Corrupted save"); }
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
    if (!state.wallet) return; 
    // Giriş yapmamışsa sunucuya gönderme (Zaten saveUserToFire kontrol ediyor)
    const dataToSave = {
        balance: state.balance,
        hashrate: state.hashrate,
        inv: state.inv,
        freeEnd: state.freeEnd
    };
    await saveUserToFire(state.wallet, dataToSave);
}

async function loadServerData(walletAddress) {
    showToast("Syncing data...", false);
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
        showToast("Data Synced ✅");
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
            showToast(`Offline Gain: ${earned.toFixed(4)} TON`);
            syncToServer();
        }
    }
}

// --- TON CONNECT ---
function setupTonConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json',
    });

    tonConnectUI.onStatusChange((wallet) => {
        const btn = document.getElementById('connectBtn');
        const addrInput = document.getElementById('w-addr');

        if (wallet) {
            const rawAddress = wallet.account.address;
            const userFriendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
            state.wallet = userFriendlyAddress;
            
            btn.innerHTML = `<i class="fas fa-check-circle"></i> ${userFriendlyAddress.substring(0, 4)}...`;
            btn.classList.add('connected');
            if(addrInput) addrInput.value = userFriendlyAddress;
            
            showToast("Wallet Connected");
            loadServerData(userFriendlyAddress);
            
        } else {
            state.wallet = null;
            btn.innerHTML = '<i class="fas fa-wallet"></i> Connect';
            btn.classList.remove('connected');
            if(addrInput) addrInput.value = "";
        }
    });
}

async function toggleWallet() {
    if (!tonConnectUI) return;
    if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
    } else {
        await tonConnectUI.openModal();
    }
}

// --- ACTIONS ---
async function buy(id) {
    if (!tonConnectUI || !tonConnectUI.connected) return showToast("Connect Wallet First!", true);

    const m = machines.find(x => x.id === id);
    if (!m) return;

    if (m.price === 0) {
        grantMachine(id);
        return;
    }

    const amountInNanotons = (m.price * 1000000000).toString();
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: ADMIN_WALLET, amount: amountInNanotons }]
    };

    try {
        showToast("Waiting for approval...", false);
        await tonConnectUI.sendTransaction(transaction);
        showToast("Payment Successful! ✅");
        grantMachine(id);
    } catch (e) {
        console.error(e);
        showToast("Transaction Cancelled ❌", true);
    }
}

function grantMachine(id) {
    const m = machines.find(x => x.id === id);
    state.hashrate += m.rate;
    state.inv.push({ mid: id, uid: Date.now() });
    updateUI();
    drawChart();
    syncToServer();
}

function withdraw() {
    if(!state.wallet) return showToast("Connect Wallet!", true);
    let val = parseFloat(document.getElementById('w-amt').value);
    if(val < 100) return showToast("Min: 100 TON", true);
    if(val > state.balance) return showToast("Insufficient Balance", true);
    
    state.balance -= val;
    updateUI();
    showToast("Withdrawal Sent!");
    syncToServer();
}

function watchAd() {
    const btn = document.querySelector('.ad-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    btn.disabled = true;
    setTimeout(() => {
        activateFree();
        showToast("🎁 +300 GH/s Activated!");
        syncToServer();
    }, 2000);
}

function activateFree() {
    state.freeEnd = Date.now() + (30 * 60 * 1000);
    state.inv.push({ mid: 999, uid: Date.now() });
    state.hashrate += 300;
    updateUI(); drawChart(); checkFree();
    saveLocalData();
}

function checkFree() {
    const btnArea = document.getElementById('adBtnArea');
    const timeArea = document.getElementById('timerArea');
    const timerTxt = document.getElementById('freeTimer');

    if(state.freeEnd > 0) {
        const diff = state.freeEnd - Date.now();
        if(diff <= 0) {
            state.freeEnd = 0;
            const idx = state.inv.findIndex(x => x.mid === 999);
            if(idx > -1) { state.inv.splice(idx,1); state.hashrate -= 300; }
            btnArea.style.display = 'block';
            timeArea.style.display = 'none';
            document.querySelector('.ad-btn').innerHTML = 'WATCH & CLAIM';
            document.querySelector('.ad-btn').disabled = false;
            updateUI(); drawChart();
            showToast("⚠️ Free Miner Expired", true);
            saveLocalData();
        } else {
            btnArea.style.display = 'none';
            timeArea.style.display = 'block';
            const m = Math.floor(diff/60000);
            const s = Math.floor((diff%60000)/1000);
            timerTxt.innerText = `${m}:${s<10?'0'+s:s}`;
        }
    } else {
        btnArea.style.display = 'block';
        timeArea.style.display = 'none';
        document.querySelector('.ad-btn').innerHTML = 'WATCH & CLAIM';
        document.querySelector('.ad-btn').disabled = false;
    }
}

// --- CORE & UI ---
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
    machines.forEach(m => {
        let btn = document.getElementById('btn-'+m.id);
        if(btn) btn.disabled = false; 
    });
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
        groups[m.id].count++; groups[m.id].total += m.rate;
    });
    let r=40, circ=2*Math.PI*r, off=0;
    Object.values(groups).forEach(g => {
        let pct = g.total / state.hashrate;
        let len = circ * pct;
        let c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", 50); c.setAttribute("cy", 50); c.setAttribute("r", r);
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
    const l = document.getElementById('marketList'); l.innerHTML = "";
    machines.filter(m=>m.id!==999).forEach(m => {
        let daily = (m.rate * CFG.rate * 86400).toFixed(2);
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info"><h4>${m.name}</h4><p>+${m.rate} GH/s • Day: ${daily}</p></div>
            <div class="ci-action"><span class="ci-price">${m.price} TON</span><button id="btn-${m.id}" class="action-btn" data-machine-id="${m.id}">BUY</button></div>
        </div>`;
    });
    
    // Event listener'ları ekle (dinamik olarak oluşturulan butonlar için)
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const machineId = parseInt(this.getAttribute('data-machine-id'));
            buy(machineId);
        });
    });
}

function renderInv() {
    const l = document.getElementById('invList'); l.innerHTML = "";
    if(state.inv.length===0) l.innerHTML = "<div style='text-align:center; color:#666'>Empty</div>";
    state.inv.slice().reverse().forEach(i => {
        let m = machines.find(x => x.id === i.mid);
        let isFree = m.id===999;
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info"><h4>${m.name}</h4><p>${isFree?'Limited Time':'Unlimited'}</p></div>
            <div class="ci-action" style="color:${isFree?'var(--danger)':'var(--success)'}; font-weight:bold; font-size:0.8rem;">${isFree?'FREE':'ACTIVE'}</div>
        </div>`;
    });
}

function showToast(msg, err=false) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.display="block";
    t.style.border = err ? "1px solid #ff453a" : "1px solid #10b981";
    t.style.color = err ? "#ff453a" : "#10b981";
    setTimeout(()=>t.style.display="none", 2000);
}

// --- GLOBAL BINDING (Module içinde çalışması için) ---
window.toggleWallet = toggleWallet;
window.watchAd = watchAd;
window.buy = buy;
window.withdraw = withdraw;
window.go = go;

// --- DOM HAZIR OLUNCA EVENT LISTENER'LARI EKLE ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready - Attaching event listeners...');
    
    // Connect Wallet Button
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', toggleWallet);
        console.log('Connect button listener attached');
    }
    
    // Withdraw Button
    const withdrawBtn = document.querySelector('.w-btn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', withdraw);
        console.log('Withdraw button listener attached');
    }
    
    // Watch Ad Button
    const adBtn = document.querySelector('.ad-btn');
    if (adBtn) {
        adBtn.addEventListener('click', watchAd);
        console.log('Ad button listener attached');
    }
    
    // Navigation Items
    document.querySelectorAll('.nav-item').forEach((navItem, index) => {
        navItem.addEventListener('click', function() {
            const views = ['dash', 'market', 'inv', 'wallet'];
            go(views[index], this);
        });
    });
    
    console.log('All event listeners attached successfully!');
});

// Init
init();
