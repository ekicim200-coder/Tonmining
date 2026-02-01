// --- IMPORT ---
// initAuth fonksiyonunu da import ettik
import { saveUserToFire, getUserFromFire, initAuth, saveWithdrawalRequest } from './firebase-config.js';

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
    { id: 1, name: "Starter CPU", price: 10, starPrice: 50, rate: 5, color: "#94a3b8", icon: "fa-microchip" },
    { id: 2, name: "GTX 1660", price: 30, starPrice: 150, rate: 15, color: "#2dd4bf", icon: "fa-memory" },
    { id: 3, name: "RTX 3060", price: 75, starPrice: 375, rate: 40, color: "#3b82f6", icon: "fa-gamepad" },
    { id: 4, name: "RTX 4090", price: 150, starPrice: 750, rate: 90, color: "#8b5cf6", icon: "fa-rocket" },
    { id: 5, name: "ASIC Miner", price: 400, starPrice: 2000, rate: 250, color: "#f472b6", icon: "fa-server" },
    { id: 999, name: "FREE ASIC", price: 0, starPrice: 0, rate: 300, color: "#ef4444", icon: "fa-server" }
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

// --- TON CONNECT ---
function setupTonConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://tonmining.vercel.app/tonconnect-manifest.json',
        buttonRootId: 'connectBtn',
        uiPreferences: {
            theme: TON_CONNECT_UI.THEME.DARK
        },
        walletsListConfiguration: {
            includeWallets: [
                {
                    appName: "tonkeeper",
                    name: "Tonkeeper",
                    imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
                    aboutUrl: "https://tonkeeper.com",
                    universalLink: "https://app.tonkeeper.com/ton-connect",
                    bridgeUrl: "https://bridge.tonapi.io/bridge",
                    platforms: ["ios", "android", "chrome", "firefox"]
                },
                {
                    appName: "tonhub",
                    name: "Tonhub",
                    imageUrl: "https://tonhub.com/tonconnect_logo.png",
                    aboutUrl: "https://tonhub.com",
                    universalLink: "https://tonhub.com/ton-connect",
                    bridgeUrl: "https://connect.tonhubapi.com/tonconnect",
                    platforms: ["ios", "android"]
                }
            ]
        }
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
async function buy(id, paymentMethod = 'ton') {
    if (!tonConnectUI || !tonConnectUI.connected) return showToast("Connect Wallet First!", true);

    const m = machines.find(x => x.id === id);
    if (!m) return;

    if (m.price === 0) {
        grantMachine(id);
        return;
    }

    if (paymentMethod === 'star') {
        // Telegram Stars ile ödeme
        buyWithStars(id);
    } else {
        // TON ile ödeme (mevcut sistem)
        const amountInNanotons = (m.price * 1000000000).toString();
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{ address: ADMIN_WALLET, amount: amountInNanotons }]
        };

        try {
            showToast("Sending Transaction...", false);
            const result = await tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                grantMachine(id);
                showToast(`✅ ${m.name} Purchased!`, false);
            }
        } catch (err) {
            console.error(err);
            showToast("Transaction Cancelled", true);
        }
    }
}

async function buyWithStars(id) {
    const m = machines.find(x => x.id === id);
    if (!m) return;

    // Telegram Web App API kontrolü
    if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
        showToast("Bu özellik sadece Telegram içinde çalışır", true);
        return;
    }

    const tg = window.Telegram.WebApp;
    
    try {
        showToast("Telegram Stars ile ödeme başlatılıyor...", false);
        
        // Invoice link oluştur (Bu kısmı backend'inize göre düzenlemeniz gerekir)
        const invoiceLink = await createStarsInvoice(id, m.starPrice);
        
        // Telegram ödeme penceresini aç
        tg.openInvoice(invoiceLink, (status) => {
            if (status === 'paid') {
                grantMachine(id);
                showToast(`✅ ${m.name} Star ile satın alındı!`, false);
            } else if (status === 'cancelled') {
                showToast("Ödeme iptal edildi", true);
            } else {
                showToast("Ödeme başarısız", true);
            }
        });
    } catch (err) {
        console.error(err);
        showToast("Star ödemesi başarısız", true);
    }
}

// Backend'inizde invoice oluşturma fonksiyonu
async function createStarsInvoice(machineId, starAmount) {
    // Production API URL - Vercel deployment
    // Geliştirme ortamında local olarak çalıştırıyorsanız URL'i değiştirin
    const API_URL = window.location.origin + '/api/create-invoice';
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            machineId: machineId,
            amount: starAmount,
            userId: currentUserUid,
            wallet: state.wallet
        })
    });
    
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Invoice oluşturulamadı');
    }
    return data.invoiceLink;
}

function grantMachine(mid) {
    const m = machines.find(x => x.id === mid);
    if (!m) return;
    
    state.inv.push({ mid: mid, uid: Date.now() });
    state.hashrate += m.rate;
    
    if (mid === 999) {
        state.freeEnd = Date.now() + (30 * 60 * 1000);
    }
    
    saveLocalData();
    syncToServer();
    updateUI();
    drawChart();
    renderInv();
}

// --- 👇 DÜZELTİLEN FONKSİYON BURADA 👇 ---
async function withdraw() {
    // 1. Cüzdan kontrolü
    if (!state.wallet) {
        return showToast("Cüzdan bağlı değil!", true);
    }

    // 2. Input alanını bul
    const inputElement = document.getElementById('w-amt');
    if (!inputElement) {
        console.error("HATA: 'w-amt' ID'li input alanı bulunamadı!");
        return showToast("Sistem hatası: Input alanı yok", true);
    }

    // 3. Değeri al ve sayıya çevir (Virgül varsa noktaya çevir)
    let rawValue = inputElement.value;
    if (rawValue) rawValue = rawValue.replace(',', '.');

    const amt = parseFloat(rawValue);

    // 4. Miktar kontrolleri
    if (isNaN(amt) || amt <= 0) {
        return showToast("Geçerli bir miktar girin!", true);
    }

    if (amt < 100) {
        return showToast("Minimum çekim: 100 TON", true);
    }

    if (amt > state.balance) {
        return showToast(`Yetersiz bakiye! (Mevcut: ${state.balance.toFixed(2)})`, true);
    }

    // 5. İsteği gönder
    showToast("İşlem yapılıyor...", false);

    // Düzeltilen kısım: (Cüzdan, Miktar) olarak iki parça gönderiyoruz
    const success = await saveWithdrawalRequest(state.wallet, amt);

    if (success) {
        state.balance -= amt;
        saveLocalData();
        syncToServer();
        updateUI();
        showToast("✅ Çekim Talebi Alındı!");
        inputElement.value = ""; 
    } else {
        showToast("Hata: Talep oluşturulamadı", true);
    }
}
// --- 👆 DÜZELTİLEN FONKSİYON BİTTİ 👆 ---

function watchAd() {
    const btn = document.querySelector('.ad-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    setTimeout(() => {
        grantMachine(999);
        showToast("✅ FREE ASIC Activated!", false);
        btn.innerHTML = 'WATCH & CLAIM';
    }, 2000);
}

function checkFree() {
    const card = document.getElementById('freeCard');
    if(!card) return;
    const btnArea = document.getElementById('adBtnArea');
    const timeArea = document.getElementById('timerArea');
    const timerTxt = document.getElementById('freeTimer');

    if(state.freeEnd > 0) {
        const diff = state.freeEnd - Date.now();
        if(diff <= 0) {
            state.freeEnd = 0;
            const idx = state.inv.findIndex(i => i.mid === 999);
            if(idx > -1) {
                const m = machines.find(x => x.id === 999);
                state.hashrate -= m.rate;
                state.inv.splice(idx, 1);
            }
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
            <div class="ci-info">
                <h4>${m.name}</h4>
                <p>+${m.rate} GH/s • Day: ${daily}</p>
            </div>
            <div class="ci-action">
                <div class="price-options">
                    <button class="price-btn ton-btn" data-machine-id="${m.id}" data-payment="ton">
                        <i class="fab fa-bitcoin"></i> ${m.price} TON
                    </button>
                    <button class="price-btn star-btn" data-machine-id="${m.id}" data-payment="star">
                        ⭐ ${m.starPrice} Stars
                    </button>
                </div>
            </div>
        </div>`;
    });
    
    // Event listener'ları ekle (dinamik olarak oluşturulan butonlar için)
    document.querySelectorAll('.price-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const machineId = parseInt(this.getAttribute('data-machine-id'));
            const paymentMethod = this.getAttribute('data-payment');
            buy(machineId, paymentMethod);
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

// DEBUG: State göster
window.showState = function() {
    console.log("Current State:", state);
    console.log("User UID:", currentUserUid);
    console.log("Wallet:", state.wallet);
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
