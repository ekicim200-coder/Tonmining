// --- IMPORT ---
import { saveUserToFire, getUserFromFire, initAuth, saveWithdrawalRequest, getHistoryFromFire, saveReferralCode, registerReferral, addReferralCommission, getReferralStats } from './firebase-config.js';

// --- AYARLAR ---
const CFG = { rate: 0.000001, tick: 100 };
const ADMIN_WALLET = "UQBfQpD5TFm0DlMkqZBymxBh9Uiyj1sqvdzkEvpgrgwS6gCc"; 

let tonConnectUI;
let currentUserUid = null;
let adsgramController;

let state = { 
    balance: 1.00, 
    hashrate: 0, 
    inv: [], 
    wallet: null,
    lastSave: Date.now(),
    freeEnd: 0,
    lastAdTime: 0,
    referralCode: null,
    referredBy: null,
    referralCount: 0,
    referralEarnings: 0
};

const machines = [
    { id: 1, name: "Basic Chip v1", price: 10, starPrice: 50, rate: 5, color: "#94a3b8", icon: "fa-microchip" },
    { id: 2, name: "Dual Core X", price: 30, starPrice: 150, rate: 15, color: "#2dd4bf", icon: "fa-memory" },
    { id: 3, name: "Quantum Processor", price: 75, starPrice: 375, rate: 40, color: "#3b82f6", icon: "fa-gamepad" },
    { id: 4, name: "Fusion Reactor", price: 150, starPrice: 750, rate: 90, color: "#8b5cf6", icon: "fa-rocket" },
    { id: 5, name: "Dark Matter Node", price: 400, starPrice: 2000, rate: 250, color: "#f472b6", icon: "fa-server" },
    { id: 999, name: "FREE Dark Matter Node", price: 0, starPrice: 0, rate: 300, color: "#ef4444", icon: "fa-server" }
];

let graphData = new Array(20).fill(10);

function init() {
    initAuth((uid) => {
        currentUserUid = uid;
        console.log("✅ Sistem Hazır. User:", uid);
    });

    loadLocalData();
    calculateOfflineProgress();
    renderMarket();
    updateUI();
    setupTonConnect();
    initAdsgram();

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
    
    const dataToSave = {
        balance: state.balance,
        hashrate: state.hashrate,
        inv: state.inv,
        freeEnd: state.freeEnd,
        lastAdTime: state.lastAdTime,
        referralCode: state.referralCode,
        referredBy: state.referredBy,
        referralCount: state.referralCount,
        referralEarnings: state.referralEarnings
    };
    await saveUserToFire(state.wallet, dataToSave);
}

async function loadServerData(walletAddress) {
    showToast("Syncing data...", false);
    
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
        state.lastAdTime = serverData.lastAdTime || 0;
        state.referralCode = serverData.referralCode || null;
        state.referredBy = serverData.referredBy || null;
        state.referralCount = serverData.referralCount || 0;
        state.referralEarnings = serverData.referralEarnings || 0;
        
        if (!state.referralCode) {
            await initReferralCode(walletAddress);
        }
        
        await checkReferralParam(walletAddress);
        
        calculateOfflineProgress();
        updateUI();
        drawChart();
        saveLocalData();
        showToast("Data Synced ✅");
    } else {
        await initReferralCode(walletAddress);
        await checkReferralParam(walletAddress);
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

// --- ADSGRAM ---
function initAdsgram() {
    console.log("🔄 Adsgram başlatılıyor...");
    const BLOCK_ID = "22343";
    
    const checkAdsgram = setInterval(() => {
        if (typeof window.Adsgram !== 'undefined') {
            clearInterval(checkAdsgram);
            try {
                adsgramController = window.Adsgram.init({
                    blockId: BLOCK_ID,
                    debug: false
                });
                console.log(`✅ Adsgram başarıyla başlatıldı`);
            } catch (error) {
                console.error("❌ Adsgram başlatma hatası:", error);
            }
        }
    }, 100);
    
    setTimeout(() => {
        if (!adsgramController) {
            clearInterval(checkAdsgram);
            console.error("❌ Adsgram yüklenemedi");
        }
    }, 5000);
}

// --- TON CONNECT ---
function setupTonConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://tonmining.vercel.app/tonconnect-manifest.json',
        buttonRootId: 'connectBtn',
        uiPreferences: { theme: TON_CONNECT_UI.THEME.DARK },
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
                }
            ]
        }
    });

    tonConnectUI.onStatusChange((wallet) => {
        const btn = document.getElementById('connectBtn');
        const addrInput = document.getElementById('w-addr');

        if (wallet) {
            state.wallet = wallet.account.address;
            btn.innerHTML = '<i class="fas fa-wallet"></i> ' + state.wallet.slice(0,6) + '...';
            if (addrInput) addrInput.value = state.wallet;
            
            loadServerData(state.wallet);
            console.log("✅ Wallet Connected:", state.wallet);
        } else {
            state.wallet = null;
            btn.innerHTML = '<i class="fas fa-wallet"></i> Connect';
            if (addrInput) addrInput.value = "";
            console.log("❌ Wallet Disconnected");
        }
    });
}

function toggleWallet() {
    if (tonConnectUI.connected) {
        tonConnectUI.disconnect();
    } else {
        tonConnectUI.openModal();
    }
}

// --- MINING LOOP ---
function loop() {
    if (state.hashrate === 0) return;
    state.balance += state.hashrate * CFG.rate * (CFG.tick / 1000);
    updateUI();
}

function updateUI() {
    document.getElementById('totalBal').textContent = state.balance.toFixed(2);
    document.getElementById('d-hash').textContent = state.hashrate;
    document.getElementById('d-count').textContent = state.inv.length;
    const daily = (state.hashrate * CFG.rate * 86400).toFixed(2);
    document.getElementById('d-daily').textContent = daily;
}

// --- FREE REWARD ---
function checkFree() {
    const card = document.getElementById('freeCard');
    const adArea = document.getElementById('adBtnArea');
    const timerArea = document.getElementById('timerArea');
    const timerEl = document.getElementById('freeTimer');
    
    if (!card || !adArea || !timerArea || !timerEl) return;
    
    if (state.freeEnd > 0 && Date.now() < state.freeEnd) {
        adArea.style.display = 'none';
        timerArea.style.display = 'block';
        const left = Math.ceil((state.freeEnd - Date.now()) / 1000);
        const m = Math.floor(left / 60);
        const s = left % 60;
        timerEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    } else {
        if (state.freeEnd > 0) {
            const freeItem = state.inv.find(i => i.mid === 999);
            if (freeItem) {
                state.inv = state.inv.filter(i => i.mid !== 999);
                const freeMachine = machines.find(m => m.id === 999);
                state.hashrate -= freeMachine.rate;
                state.freeEnd = 0;
                saveLocalData();
                syncToServer();
                updateUI();
                drawChart();
                renderInv();
            }
        }
        adArea.style.display = 'block';
        timerArea.style.display = 'none';
    }
}

async function watchAd() {
    if (!adsgramController) {
        showToast("Ad system not ready", true);
        return;
    }
    
    const now = Date.now();
    if (state.lastAdTime && (now - state.lastAdTime) < 60000) {
        const waitTime = Math.ceil((60000 - (now - state.lastAdTime)) / 1000);
        showToast(`Wait ${waitTime}s before next ad`, true);
        return;
    }
    
    try {
        showToast("Loading ad...", false);
        
        await adsgramController.show().then(() => {
            state.lastAdTime = Date.now();
            grantMachine(999);
            showToast("✅ FREE Device Granted!", false);
            saveLocalData();
            syncToServer();
        }).catch((error) => {
            if (error.code === 'AdNotReady') {
                showToast("Ad not ready, try again", true);
            } else {
                showToast("Ad cancelled", true);
            }
            console.error("Ad error:", error);
        });
    } catch (err) {
        console.error("Watch ad error:", err);
        showToast("Ad failed", true);
    }
}

// --- PURCHASE ---
async function buy(id, paymentMethod = 'ton') {
    if (!tonConnectUI || !tonConnectUI.connected) {
        showToast("Connect Wallet First!", true);
        return;
    }

    const m = machines.find(x => x.id === id);
    if (!m) return;

    if (m.price === 0) {
        grantMachine(id);
        return;
    }

    if (paymentMethod === 'star') {
        buyWithStars(id);
    } else {
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

    if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
        showToast("Bu özellik sadece Telegram içinde çalışır", true);
        return;
    }

    const tg = window.Telegram.WebApp;
    
    try {
        showToast("Telegram Stars ile ödeme başlatılıyor...", false);
        const invoiceLink = await createStarsInvoice(id, m.starPrice);
        
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

async function createStarsInvoice(machineId, starAmount) {
    const API_URL = window.location.origin + '/api/create-invoice';
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            machineId: machineId,
            starAmount: starAmount,
            walletAddress: state.wallet
        })
    });

    if (!response.ok) {
        throw new Error('Invoice oluşturulamadı');
    }

    const data = await response.json();
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
    
    if (m.price > 0 && state.wallet) {
        addReferralCommission(state.wallet, m.price).then(success => {
            if (success) {
                console.log(`✅ Referans komisyonu eklendi: ${m.price * 0.4} TON`);
            }
        });
    }
    
    saveLocalData();
    syncToServer();
    updateUI();
    drawChart();
    renderInv();
}

// --- WITHDRAW ---
async function withdraw() {
    if (!state.wallet) {
        showToast("Cüzdan bağlı değil!", true);
        return;
    }

    const inputElement = document.getElementById('w-amt');
    if (!inputElement) {
        showToast("Miktar giriş alanı bulunamadı!", true);
        return;
    }

    const amountStr = inputElement.value.trim();
    if (!amountStr) {
        showToast("Lütfen miktar girin!", true);
        return;
    }

    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
        showToast("Geçerli bir miktar girin!", true);
        return;
    }

    if (amount < 100) {
        showToast("Minimum 100 TON!", true);
        return;
    }

    if (amount > state.balance) {
        showToast("Yetersiz bakiye!", true);
        return;
    }

    try {
        showToast("İşleniyor...", false);
        
        const success = await saveWithdrawalRequest(state.wallet, amount);
        
        if (success) {
            state.balance -= amount;
            saveLocalData();
            await syncToServer();
            updateUI();
            inputElement.value = '';
            showToast("✅ Çekim talebi oluşturuldu!", false);
            setTimeout(() => renderHistory(), 500);
        } else {
            showToast("Çekim talebi başarısız!", true);
        }
    } catch (error) {
        console.error("Withdraw error:", error);
        showToast("Bir hata oluştu!", true);
    }
}

// --- NAV ---
function go(id, el) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('v-'+id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    
    if(el) el.classList.add('active');
    
    if(id==='dash') drawChart();
    if(id==='inv') renderInv();
    if(id==='wallet') renderHistory();
    if(id==='referral') {
        updateReferralUI();
        renderReferralHistory();
    }
}

function drawChart() {
    const svg = document.getElementById('chartSegments');
    if (!svg) return;
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
    const lineEl = document.getElementById('liveLine');
    if (lineEl) lineEl.setAttribute('points', pts);
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
    if (!box) return;
    box.innerHTML += `<div class="log-line"><span style="color:#666">[${d}]</span> > ${msg}</div>`;
    box.scrollTop = box.scrollHeight;
}

function renderMarket() {
    const l = document.getElementById('marketList'); 
    if (!l) return;
    l.innerHTML = "";
    
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
                    <button class="price-btn ton-btn" onclick="buy(${m.id}, 'ton')">
                        <i class="fab fa-bitcoin"></i> ${m.price} TON
                    </button>
                    <button class="price-btn star-btn" onclick="buy(${m.id}, 'star')">
                        ⭐ ${m.starPrice} Stars
                    </button>
                </div>
            </div>
        </div>`;
    });
}

function renderInv() {
    const l = document.getElementById('invList'); 
    if (!l) return;
    l.innerHTML = "";
    if(state.inv.length===0) {
        l.innerHTML = "<div style='text-align:center; color:#666'>Empty</div>";
        return;
    }
    
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

async function renderHistory() {
    const listEl = document.getElementById('tx-history-list');
    if (!listEl) return;

    if (!state.wallet) {
        listEl.innerHTML = "<p style='color:#666'>Please connect wallet.</p>";
        return;
    }

    listEl.innerHTML = "<p style='color:#999'>Loading...</p>";
    const history = await getHistoryFromFire(state.wallet);

    if (history.length === 0) {
        listEl.innerHTML = "<p style='color:#666'>No transactions yet.</p>";
        return;
    }

    let html = "";
    history.forEach(tx => {
        const date = new Date(tx.requestDate).toLocaleString();
        const color = tx.status === 'pending' ? 'orange' : (tx.status === 'paid' ? '#10b981' : 'rejected');
        const statusText = tx.status === 'pending' ? 'pending' : (tx.status === 'paid' ? 'paid' : 'rejected');

        html += `
        <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: bold; color: #fff;">-${tx.amount} TON</div>
                <div style="font-size: 0.75rem; color: #888;">${date}</div>
            </div>
            <div style="color: ${color}; font-size: 0.85rem; font-weight: bold;">
                ${statusText} <i class="fas fa-circle" style="font-size: 6px; vertical-align: middle;"></i>
            </div>
        </div>`;
    });

    listEl.innerHTML = html;
}

// --- REFERRAL SYSTEM ---
async function initReferralCode(walletAddress) {
    if (!walletAddress) return;
    const code = 'REF' + walletAddress.substring(0, 8).toUpperCase();
    state.referralCode = code;
    await saveReferralCode(walletAddress, code);
    updateReferralUI();
}

async function checkReferralParam(walletAddress) {
    if (!walletAddress || state.referredBy) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && refCode !== state.referralCode) {
        const success = await registerReferral(walletAddress, refCode);
        if (success) {
            showToast("✅ Referral bonus activated!", false);
            state.referredBy = refCode;
        }
    }
}

function updateReferralUI() {
    const refCodeInput = document.getElementById('ref-code');
    const refLinkInput = document.getElementById('ref-link');
    const refCountEl = document.getElementById('ref-count');
    const refEarningsEl = document.getElementById('ref-earnings');
    
    if (refCodeInput && state.referralCode) {
        refCodeInput.value = state.referralCode;
    }
    
    if (refLinkInput && state.referralCode) {
        const baseUrl = window.location.origin + window.location.pathname;
        refLinkInput.value = `${baseUrl}?ref=${state.referralCode}`;
    }
    
    if (refCountEl) {
        refCountEl.textContent = state.referralCount || 0;
    }
    
    if (refEarningsEl) {
        refEarningsEl.textContent = (state.referralEarnings || 0).toFixed(2);
    }
}

async function renderReferralHistory() {
    const listEl = document.getElementById('ref-history-list');
    if (!listEl || !state.wallet) return;
    
    listEl.innerHTML = "<p style='color:#999'>Loading...</p>";
    const stats = await getReferralStats(state.wallet);
    
    state.referralCount = stats.count;
    state.referralEarnings = stats.earnings;
    updateReferralUI();
    
    if (stats.history.length === 0) {
        listEl.innerHTML = "<p style='color:#666'>No referrals yet. Share your link!</p>";
        return;
    }
    
    let html = "";
    stats.history.forEach(ref => {
        const date = new Date(ref.date).toLocaleString();
        const buyerShort = ref.buyerWallet.substring(0, 6) + '...' + ref.buyerWallet.substring(ref.buyerWallet.length - 4);
        
        html += `
        <div style="background: rgba(16,185,129,0.1); padding: 10px; margin-bottom: 8px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="font-weight: bold; color: var(--success);">+${ref.commission.toFixed(2)} TON</div>
                <div style="font-size: 0.75rem; color: #888;">${date}</div>
            </div>
            <div style="font-size: 0.8rem; color: #aaa;">
                From: ${buyerShort} • Machine: ${ref.machinePrice} TON
            </div>
        </div>`;
    });
    
    listEl.innerHTML = html;
}

function copyReferralCode() {
    const refCodeInput = document.getElementById('ref-code');
    if (refCodeInput) {
        refCodeInput.select();
        document.execCommand('copy');
        showToast("✅ Referral code copied!", false);
    }
}

function shareReferralLink() {
    const refLinkInput = document.getElementById('ref-link');
    if (!refLinkInput) return;
    
    const link = refLinkInput.value;
    
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const message = `🚀 Join TON Pro Miner and earn crypto!\n\n💰 Get FREE mining power\n🎁 Use my referral code: ${state.referralCode}\n\n${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`);
    } else {
        refLinkInput.select();
        document.execCommand('copy');
        showToast("✅ Link copied! Share with friends", false);
    }
}

function showToast(msg, err=false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg; 
    t.style.display="block";
    t.style.border = err ? "1px solid #ff453a" : "1px solid #10b981";
    t.style.color = err ? "#ff453a" : "#10b981";
    setTimeout(()=>t.style.display="none", 2000);
}

// --- GLOBAL BINDINGS ---
window.toggleWallet = toggleWallet;
window.watchAd = watchAd;
window.buy = buy;
window.withdraw = withdraw;
window.go = go;
window.copyReferralCode = copyReferralCode;
window.shareReferralLink = shareReferralLink;

// --- DEBUG ---
console.log("=== SCRIPT LOADED ===");
console.log("toggleWallet:", typeof window.toggleWallet);
console.log("buy:", typeof window.buy);
console.log("watchAd:", typeof window.watchAd);
console.log("withdraw:", typeof window.withdraw);
console.log("go:", typeof window.go);
console.log("====================");

// --- INIT ---
init();
