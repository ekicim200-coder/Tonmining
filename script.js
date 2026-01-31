// --- IMPORT ---
// initAuth fonksiyonunu da import ettik
import { saveUserToFire, getUserFromFire, initAuth, saveWithdrawalRequest } from './firebase-config.js';
import { isTelegramAvailable, createTelegramInvoice, applyTelegramTheme, getTelegramUserId } from './telegram-integration.js';

// --- AYARLAR ---
const CFG = { rate: 0.000001, tick: 100 };
// ÖNEMLİ: Buraya KENDİ TON CÜZDAN ADRESİNİZİ girin!
// Örnek: "UQC5h1-xI12Kq8PsWNK9tBNBzdGw-h0zLyDGPRaz3kw3iuSX"
const ADMIN_WALLET = "UQBfQpD5TFm0DlMkqZBymxBh9Uiyj1sqvdzkEvpgrgwS6gCc"; // BURAYA KENDİ CÜZDAN ADRESİNİZİ YAZIN!

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
    // Telegram Mini App teması uygula
    if (isTelegramAvailable()) {
        console.log("🚀 Telegram Mini App algılandı!");
        applyTelegramTheme();
    }
    
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
    if (!currentUserUid) {
        console.log("⏳ Auth not ready yet, skipping sync...");
        return;
    }
    
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
    
    // Auth hazır olana kadar bekle
    let attempts = 0;
    while (!currentUserUid && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!currentUserUid) {
        showToast("Auth not ready, please retry", true);
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

// --- TON CONNECT (DÜZELTİLMİŞ) ---
function setupTonConnect() {
    console.log("🔧 TON Connect başlatılıyor...");
    
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://tonmining.vercel.app/tonconnect-manifest.json',
            buttonRootId: 'connectBtn',
            uiPreferences: {
                theme: TON_CONNECT_UI.THEME.DARK
            },
            // DÜZELTİLMİŞ: Güncel bridge URL'leri kullanılıyor
            walletsListConfiguration: {
                includeWallets: [
                    {
                        appName: "tonkeeper",
                        name: "Tonkeeper",
                        imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
                        aboutUrl: "https://tonkeeper.com",
                        // DÜZELTİLDİ: Güncel Tonkeeper bridge
                        universalLink: "https://app.tonkeeper.com/ton-connect",
                        bridgeUrl: "https://bridge.tonapi.io/bridge",
                        platforms: ["ios", "android", "chrome", "firefox", "safari"]
                    },
                    {
                        appName: "mytonwallet",
                        name: "MyTonWallet",
                        imageUrl: "https://static.mytonwallet.io/icon-256.png",
                        aboutUrl: "https://mytonwallet.io",
                        // DÜZELTİLDİ: MyTonWallet eklendi
                        universalLink: "https://connect.mytonwallet.org",
                        bridgeUrl: "https://bridge.mytonwallet.org/bridge",
                        platforms: ["chrome", "firefox", "safari", "ios", "android"]
                    }
                ]
            },
            // EKSTRA: Timeout ve retry ayarları
            actionsConfiguration: {
                twaReturnUrl: 'https://tonmining.vercel.app'
            }
        });

        console.log("✅ TON Connect UI oluşturuldu");

        // Bağlantı durumu değişikliklerini dinle
        tonConnectUI.onStatusChange((wallet) => {
            console.log("🔄 Wallet durumu değişti:", wallet ? "CONNECTED" : "DISCONNECTED");
            
            const btn = document.getElementById('connectBtn');
            const addrInput = document.getElementById('w-addr');

            if (wallet) {
                const rawAddress = wallet.account.address;
                const userFriendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
                state.wallet = userFriendlyAddress;
                
                btn.innerHTML = `<i class="fas fa-check-circle"></i> ${userFriendlyAddress.substring(0, 4)}...`;
                btn.classList.add('connected');
                if(addrInput) addrInput.value = userFriendlyAddress;
                
                showToast("Wallet Connected ✅");
                loadServerData(userFriendlyAddress);
                
            } else {
                state.wallet = null;
                btn.innerHTML = '<i class="fas fa-wallet"></i> Connect';
                btn.classList.remove('connected');
                if(addrInput) addrInput.value = "";
            }
        });
        
        console.log("✅ Event listener'lar bağlandı");
        
    } catch (error) {
        console.error("❌ TON Connect başlatma hatası:", error);
        showToast("Connection error, reload page", true);
    }
}

async function toggleWallet() {
    if (!tonConnectUI) {
        console.error("❌ TON Connect UI henüz hazır değil");
        showToast("Please wait, loading...", true);
        return;
    }
    
    try {
        if (tonConnectUI.connected) {
            console.log("🔌 Wallet bağlantısı kesiliyor...");
            await tonConnectUI.disconnect();
        } else {
            console.log("🔗 Wallet bağlanıyor...");
            await tonConnectUI.openModal();
        }
    } catch (error) {
        console.error("❌ Wallet işlemi hatası:", error);
        showToast("Connection failed, try again", true);
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

    // Telegram Mini App içinde mi kontrol et
    if (isTelegramAvailable()) {
        const success = await createTelegramInvoice(m.price, m.name, `TON Miner: ${m.name} satın al`);
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

    // Normal TON Connect ödeme akışı
    if (!state.wallet) {
        showToast("Connect wallet first", true);
        return;
    }

    if (state.balance < m.price) {
        showToast("Insufficient balance", true);
        return;
    }

    const userConfirmed = confirm(`Buy ${m.name} for ${m.price} TON?`);
    if (!userConfirmed) return;

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

    const userConfirmed = confirm(`Withdraw ${amt} TON to ${addr}?`);
    if (!userConfirmed) return;

    try {
        const userId = getTelegramUserId() || state.wallet || 'unknown';
        
        const success = await saveWithdrawalRequest({
            userId: userId,
            walletAddress: addr,
            amount: amt,
            timestamp: Date.now(),
            status: 'pending'
        });

        if (success) {
            state.balance -= amt;
            updateUI();
            saveLocalData();
            syncToServer();
            showToast("Request submitted! ✅");
            amtInput.value = "";
        } else {
            showToast("Request failed", true);
        }

    } catch (e) {
        showToast("Error occurred", true);
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
        updateUI(); drawChart(); saveLocalData(); syncToServer();
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
    showToast("Machine granted for 3 hours!");
}

async function watchAd() {
    showToast("Ad loading...");
    
    // Telegram Mini App için test
    if (isTelegramAvailable()) {
        console.log("🎬 Telegram ortamında reklam izleme testi");
    }
    
    setTimeout(() => {
        const bonus = Math.random() * 0.5 + 0.1;
        state.balance += bonus;
        updateUI();
        saveLocalData();
        syncToServer();
        showToast(`+${bonus.toFixed(4)} TON reward!`);
    }, 2000);
}

// --- LOOP ---
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

// DEBUG: Firebase test fonksiyonu
window.testFirebaseManual = async function() {
    console.log("🔍 Firebase Manuel Test Başlıyor...");
    
    if (!currentUserUid) {
        console.error("❌ Kullanıcı henüz giriş yapmamış, bekleyin...");
        return;
    }
    
    const testWallet = "TEST_WALLET_" + Date.now();
    const testData = {
        balance: 999.99,
        hashrate: 500,
        inv: [{mid: 1, uid: Date.now()}],
        freeEnd: 0
    };
    
    console.log("📤 Test verisi gönderiliyor:", testWallet);
    const result = await saveUserToFire(testWallet, testData);
    
    if (result) {
        console.log("✅ BAŞARILI! Firebase Console'da kontrol edin.");
        console.log("🔗 https://console.firebase.google.com/project/tonm-77373/firestore/data");
    } else {
        console.log("❌ BAŞARISIZ! Yukarıdaki hatalara bakın.");
    }
}

// DEBUG: Telegram Mode Test
window.testTelegramMode = function() {
    console.log("🧪 Telegram Mode Testi");
    console.log("Telegram Available:", isTelegramAvailable());
    console.log("Current Payment Mode:", isTelegramAvailable() ? "TELEGRAM STARS" : "TON CONNECT");
    
    // Test için Telegram'ı simüle et
    if (!window.Telegram) {
        console.log("⚠️ Telegram SDK yok, simülasyon yapılıyor...");
        window.Telegram = {
            WebApp: {
                initDataUnsafe: { user: { id: 123456789 } },
                themeParams: {},
                expand: () => console.log("Telegram expand()"),
                BackButton: { hide: () => {} },
                MainButton: { hide: () => {} }
            }
        };
        console.log("✅ Telegram simüle edildi! Sayfayı yenileyin.");
    }
}

// DEBUG: State göster
window.showState = function() {
    console.log("Current State:", state);
    console.log("User UID:", currentUserUid);
    console.log("Wallet:", state.wallet);
}

// DEBUG: TON Connect durumunu kontrol et
window.checkTonConnect = function() {
    console.log("=== TON CONNECT STATUS ===");
    console.log("TON Connect UI:", tonConnectUI ? "✅ Initialized" : "❌ Not initialized");
    if (tonConnectUI) {
        console.log("Connected:", tonConnectUI.connected);
        console.log("Wallet:", tonConnectUI.wallet);
        console.log("Account:", tonConnectUI.account);
    }
    console.log("=========================");
}

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
