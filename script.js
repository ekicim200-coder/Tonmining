// --- IMPORT ---
import { saveUserToFire, getUserFromFire, initAuth, saveWithdrawalRequest, getHistoryFromFire, saveReferralCode, registerReferral, addReferralCommission, getReferralStats } from './firebase-config.js';

// --- TELEGRAM WEBAPP ---
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    console.log("✅ Telegram WebApp ready");
}

// --- CONFIG ---
const CFG = { rate: 0.000001, tick: 100 };
const ADMIN_WALLET = "UQBfQpD5TFm0DlMkqZBymxBh9Uiyj1sqvdzkEvpgrgwS6gCc"; 
const BOT_USERNAME = "YourBotUsername"; // ⚠️ BURAYA BOT USERNAME GİRİN!

let tonConnectUI;
let currentUserUid = null;
let adsgramController;
let referralCodePending = null;

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
    referralEarnings: 0,
    referralLocked: false,
    referralBonusReceived: false
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
        console.log("✅ User:", uid);
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
    
    setupEventListeners();
    checkReferralPopup();
}

function setupEventListeners() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) connectBtn.addEventListener('click', () => toggleWallet());
    
    const adBtn = document.querySelector('.ad-btn');
    if (adBtn) adBtn.addEventListener('click', () => watchAd());
    
    const withdrawBtn = document.getElementById('withdraw-btn');
    if (withdrawBtn) withdrawBtn.addEventListener('click', () => withdraw());
    
    const copyBtn = document.getElementById('copy-ref-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyReferralCode());
    
    const shareBtn = document.getElementById('share-ref-btn');
    if (shareBtn) shareBtn.addEventListener('click', () => shareReferralLink());
    
    document.querySelectorAll('.nav-item').forEach((item, index) => {
        item.addEventListener('click', function() {
            const views = ['dash', 'market', 'inv', 'wallet', 'referral'];
            if (index < views.length) {
                go(views[index], this);
            }
        });
    });
}

// --- REFERRAL POPUP --- (POPUP KALDIRILDI)
function checkReferralPopup() {
    // Popup kaldırıldı - sadece URL'den referral kodu algıla
    let refCode = null;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        refCode = tg.initDataUnsafe.start_param;
    }
    
    if (!refCode) {
        const urlParams = new URLSearchParams(window.location.search);
        refCode = urlParams.get('ref');
    }
    
    // Kod varsa ve daha önce kullanılmamışsa kaydet
    if (refCode && !localStorage.getItem('hasUsedReferral')) {
        referralCodePending = refCode;
        localStorage.setItem('hasUsedReferral', 'applied');
        console.log('✅ Referral code detected:', refCode);
        
        // Input'a otomatik yaz
        const refInput = document.getElementById('refInput');
        if (refInput) {
            refInput.value = refCode;
        }
    }
}

function showRefPopup() {
    // Popup kaldırıldı
}

function hideRefPopup() {
    // Popup kaldırıldı
}

window.skipReferral = function() {
    // Popup kaldırıldı
}

// Manuel referral kod uygulama (input'tan)
window.applyReferralCode = async function() {
    const refInput = document.getElementById('refInput');
    if (!refInput) return;
    
    const code = refInput.value.trim().toUpperCase();
    
    if (!code) {
        showToast("Please enter a code!", true);
        return;
    }
    
    if (!code.startsWith('REF') || code.length < 8) {
        showToast("Invalid code format!", true);
        return;
    }
    
    // Daha önce referral kullanılmış mı kontrol et
    const hasUsedRef = localStorage.getItem('hasUsedReferral');
    if (hasUsedRef && hasUsedRef !== 'skipped') {
        showToast("You already used a referral code!", true);
        return;
    }
    
    // Kodu kaydet
    referralCodePending = code;
    localStorage.setItem('hasUsedReferral', 'applied');
    
    // Eğer wallet bağlıysa hemen uygula
    if (state.wallet && !state.referredBy) {
        await applyPendingReferral(state.wallet);
    } else {
        showToast("✅ Code saved! Connect wallet to activate", false);
    }
    
    // Input'u temizle
    refInput.value = '';
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
    if (!state.wallet || !currentUserUid) return;
    
    const dataToSave = {
        balance: state.balance,
        hashrate: state.hashrate,
        inv: state.inv,
        freeEnd: state.freeEnd,
        lastAdTime: state.lastAdTime,
        referralCode: state.referralCode,
        referredBy: state.referredBy,
        referralCount: state.referralCount,
        referralEarnings: state.referralEarnings,
        referralLocked: state.referralLocked,
        referralBonusReceived: state.referralBonusReceived
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
        state.lastAdTime = serverData.lastAdTime || 0;
        state.referralCode = serverData.referralCode || null;
        state.referredBy = serverData.referredBy || null;
        state.referralCount = serverData.referralCount || 0;
        state.referralEarnings = serverData.referralEarnings || 0;
        state.referralLocked = serverData.referralLocked || false;
        state.referralBonusReceived = serverData.referralBonusReceived || false;
        
        if (!state.referralCode) {
            await initReferralCode(walletAddress);
        }
        
        if (referralCodePending && !state.referredBy) {
            await applyPendingReferral(walletAddress);
        }
        
        calculateOfflineProgress();
        updateUI();
        updateReferralUI();
        drawChart();
        saveLocalData();
        showToast("Synced ✅");
    } else {
        await initReferralCode(walletAddress);
        if (referralCodePending && !state.referredBy) {
            await applyPendingReferral(walletAddress);
        }
        syncToServer();
    }
}

async function applyPendingReferral(walletAddress) {
    if (!referralCodePending) return;
    
    showToast("Activating referral...", false);
    const success = await registerReferral(walletAddress, referralCodePending);
    
    if (success) {
        state.referredBy = referralCodePending;
        state.referralLocked = true;
        
        // 🎁 HEDİYE: Basic Chip v1
        if (!state.referralBonusReceived) {
            grantReferralBonus();
        }
        
        showToast("✅ Referral + FREE machine!", false);
        updateReferralUI();
        syncToServer();
    } else {
        showToast("❌ Invalid or used code!", true);
    }
    
    referralCodePending = null;
}

// 🎁 REFERANS HEDİYESİ FONKSİYONU
function grantReferralBonus() {
    const basicChip = machines.find(m => m.id === 1);
    
    state.inv.push({ mid: 1, uid: Date.now(), bonus: true });
    state.hashrate += basicChip.rate;
    state.referralBonusReceived = true;
    
    saveLocalData();
    syncToServer();
    updateUI();
    drawChart();
    renderInv();
    
    console.log("🎁 Bonus: Basic Chip v1!");
    
    setTimeout(() => {
        showToast("🎁 +5 GH/s Basic Chip!", false);
    }, 1000);
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

// --- ADSGRAM ---
function initAdsgram() {
    const BLOCK_ID = "22343";
    const check = setInterval(() => {
        if (typeof window.Adsgram !== 'undefined') {
            clearInterval(check);
            try {
                adsgramController = window.Adsgram.init({ blockId: BLOCK_ID });
                console.log("✅ Adsgram ready");
            } catch (error) {
                console.error("❌ Adsgram:", error);
            }
        }
    }, 100);
}

// --- TON CONNECT ---
async function setupTonConnect() {
    const check = setInterval(async () => {
        if (typeof window.TON_CONNECT_UI !== 'undefined') {
            clearInterval(check);
            try {
                tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
                    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
                    buttonRootId: 'connectBtn'
                });

                tonConnectUI.onStatusChange(async (walletInfo) => {
                    if (walletInfo && walletInfo.account) {
                        const address = walletInfo.account.address;
                        state.wallet = address;
                        
                        const btn = document.getElementById('connectBtn');
                        if (btn) {
                            btn.innerHTML = '<i class="fas fa-wallet"></i> ' + address.substring(0,6) + '...' + address.substring(address.length-4);
                        }
                        
                        const addrInput = document.getElementById('w-addr');
                        if (addrInput) {
                            addrInput.value = address;
                            addrInput.disabled = true;
                        }
                        
                        await loadServerData(address);
                    } else {
                        state.wallet = null;
                        const btn = document.getElementById('connectBtn');
                        if (btn) btn.innerHTML = '<i class="fas fa-wallet"></i> Connect';
                        
                        const addrInput = document.getElementById('w-addr');
                        if (addrInput) {
                            addrInput.value = '';
                            addrInput.disabled = true;
                        }
                    }
                });

                console.log("✅ TonConnect ready");
            } catch (error) {
                console.error("❌ TonConnect:", error);
            }
        }
    }, 100);
}

async function toggleWallet() {
    if (!tonConnectUI) return;
    if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
    } else {
        await tonConnectUI.openModal();
    }
}

// --- GAME LOOP ---
function loop() {
    if (state.hashrate > 0) {
        state.balance += state.hashrate * CFG.rate * (CFG.tick/1000);
        updateUI();
    }
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
    const adArea = document.getElementById('adBtnArea');
    const timerArea = document.getElementById('timerArea');
    const timerEl = document.getElementById('freeTimer');
    
    if (!adArea || !timerArea || !timerEl) return;
    
    if (state.freeEnd > 0 && Date.now() < state.freeEnd) {
        adArea.style.display = 'none';
        timerArea.style.display = 'block';
        const left = Math.ceil((state.freeEnd - Date.now()) / 1000);
        const m = Math.floor(left / 60);
        const s = left % 60;
        timerEl.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    } else {
        if (state.freeEnd > 0) {
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
        adArea.style.display = 'block';
        timerArea.style.display = 'none';
    }
}

async function watchAd() {
    if (!adsgramController) {
        showToast("Ad not ready", true);
        return;
    }
    
    const now = Date.now();
    if (state.lastAdTime && (now - state.lastAdTime) < 60000) {
        const waitTime = Math.ceil((60000 - (now - state.lastAdTime)) / 1000);
        showToast(`Wait ${waitTime}s`, true);
        return;
    }
    
    try {
        showToast("Loading ad...", false);
        await adsgramController.show().then(() => {
            state.lastAdTime = Date.now();
            grantMachine(999);
            showToast("✅ FREE Device!", false);
            saveLocalData();
            syncToServer();
        }).catch(() => {
            showToast("Ad cancelled", true);
        });
    } catch (err) {
        showToast("Ad failed", true);
    }
}

// --- PURCHASE ---
window.buy = async function(id, paymentMethod = 'ton') {
    if (!tonConnectUI || !tonConnectUI.connected) {
        showToast("Connect Wallet!", true);
        return;
    }

    const m = machines.find(x => x.id === id);
    if (!m) return;

    if (paymentMethod === 'star') {
        buyWithStars(id);
    } else {
        const amountInNanotons = (m.price * 1000000000).toString();
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{ address: ADMIN_WALLET, amount: amountInNanotons }]
        };

        try {
            showToast("Sending...", false);
            const result = await tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                grantMachine(id);
                showToast(`✅ ${m.name}!`, false);
            }
        } catch (err) {
            console.error(err);
            showToast("Cancelled", true);
        }
    }
}

async function buyWithStars(id) {
    const m = machines.find(x => x.id === id);
    if (!m || !tg) {
        showToast("Telegram required", true);
        return;
    }
    
    try {
        showToast("Opening...", false);
        const invoiceLink = await createStarsInvoice(id, m.starPrice);
        
        tg.openInvoice(invoiceLink, (status) => {
            if (status === 'paid') {
                grantMachine(id);
                showToast(`✅ ${m.name}!`, false);
            } else {
                showToast("Cancelled", true);
            }
        });
    } catch (err) {
        console.error(err);
        showToast("Failed", true);
    }
}

async function createStarsInvoice(machineId, starAmount) {
    const API_URL = window.location.origin + '/api/create-invoice';
    
    // Telegram User ID'yi al
    let userId = 'unknown';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        userId = tg.initDataUnsafe.user.id.toString();
    }
    
    console.log('📤 Creating Stars invoice - Machine:', machineId, 'User ID:', userId);
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            machineId: machineId,
            starAmount: starAmount,
            walletAddress: state.wallet,
            userId: userId,
            wallet: state.wallet
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Invoice creation failed:', errorData);
        throw new Error(errorData.error || 'Invoice failed');
    }

    const data = await response.json();
    console.log('✅ Invoice created:', data.invoiceLink);
    
    return data.invoiceLink;
}

async function grantMachine(mid) {
    const m = machines.find(x => x.id === mid);
    if (!m) return;

    if (mid === 999) {
        state.freeEnd = Date.now() + (30 * 60 * 1000);
        state.inv.push({ mid, uid: Date.now(), bonus: false });
    } else {
        state.inv.push({ mid, uid: Date.now(), bonus: false });
        
        // Referral commission
        if (state.wallet && m.price > 0) {
            await addReferralCommission(state.wallet, m.price);
        }
    }

    state.hashrate += m.rate;
    saveLocalData();
    syncToServer();
    updateUI();
    drawChart();
    renderInv();
}

// --- WITHDRAWAL ---
window.withdraw = async function() {
    const inputElement = document.getElementById('w-amt');
    const amountStr = inputElement?.value;

    if (!state.wallet) {
        showToast("Connect wallet!", true);
        return;
    }

    if (!amountStr || parseFloat(amountStr) <= 0) {
        showToast("Invalid amount!", true);
        return;
    }

    const amount = parseFloat(amountStr);

    if (amount < 100) {
        showToast("Minimum 100 TON!", true);
        return;
    }

    if (amount > state.balance) {
        showToast("Insufficient!", true);
        return;
    }

    try {
        showToast("Processing...", false);
        const success = await saveWithdrawalRequest(state.wallet, amount);
        
        if (success) {
            state.balance -= amount;
            saveLocalData();
            await syncToServer();
            updateUI();
            inputElement.value = '';
            showToast("✅ Requested!", false);
            
            // Bilgi bölümünü göster
            showProcessingSection(amount);
            
            setTimeout(() => renderHistory(), 500);
        } else {
            showToast("Failed!", true);
        }
    } catch (error) {
        console.error(error);
        showToast("Error!", true);
    }
}

// --- PROCESSING INFO ---
function showProcessingSection(amount) {
    const processingSection = document.getElementById('processing-section');
    const amountDisplay = document.getElementById('withdrawal-ton-amount');
    
    if (!processingSection) {
        console.error('❌ Processing section bulunamadı!');
        return;
    }
    
    // Miktarı göster
    if (amountDisplay) {
        amountDisplay.textContent = amount.toFixed(2);
    }
    
    // Section'ı göster
    processingSection.style.display = 'block';
    
    // Smooth scroll
    setTimeout(() => {
        processingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    
    console.log('✅ Processing section gösterildi. Miktar:', amount);
}

// --- NAV ---
function go(id, el) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('v-'+id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    
    if(el) el.classList.add('active');
    
    if(id==='dash') drawChart();
    if(id==='market') renderMarket();
    if(id==='inv') renderInv();
    if(id==='wallet') renderHistory();
    if(id==='referral') {
        updateReferralUI();
        renderReferralHistory();
    }
}

// Global fonksiyon - HTML onclick için
window.changeView = function(id, el) {
    go(id, el);
};

// --- CHART ---
function drawChart() {
    const container = document.getElementById('chartSegments');
    if (!container) return;
    container.innerHTML = '';

    const total = state.inv.reduce((sum, i) => {
        const m = machines.find(x => x.id === i.mid);
        return sum + (m?.rate || 0);
    }, 0);

    let currentAngle = 0;

    state.inv.forEach(i => {
        const m = machines.find(x => x.id === i.mid);
        if (!m) return;

        const percentage = m.rate / total;
        const angle = percentage * 360;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const largeArcFlag = angle > 180 ? 1 : 0;

        const startX = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
        const startY = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
        const endX = 50 + 40 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
        const endY = 50 + 40 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);

        path.setAttribute("d", `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`);
        path.setAttribute("fill", m.color);
        path.setAttribute("opacity", "0.8");

        container.appendChild(path);
        currentAngle += angle;
    });
}

// --- GRAPH ---
function graphLoop() {
    const val = 10 + Math.random() * 8;
    graphData.shift();
    graphData.push(val);

    const line = document.getElementById('liveLine');
    if (!line) return;

    const points = graphData.map((v, i) => {
        const x = (i / (graphData.length - 1)) * 100;
        const y = 20 - (v / 20) * 20;
        return `${x},${y}`;
    }).join(' ');

    line.setAttribute('points', points);
}

// --- TERMINAL ---
const logs = [
    'Hashrate +5 GH/s',
    'Block mined successfully',
    'Network latency: 12ms',
    'Peer sync complete',
    'Transaction confirmed',
    'Mining pool connected'
];

function termLoop() {
    const term = document.getElementById('termLogs');
    if (!term) return;

    const msg = logs[Math.floor(Math.random() * logs.length)];
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = '> ' + msg;

    term.appendChild(line);

    while (term.childElementCount > 5) {
        term.removeChild(term.firstChild);
    }
}

// --- MARKET & INVENTORY ---
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
        if (!m) return;
        
        let isFree = m.id===999;
        let isBonus = i.bonus === true;
        
        let badge, badgeStyle;
        if (isFree) {
            badge = 'FREE';
            badgeStyle = 'background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid #ef4444; padding:4px 8px; border-radius:6px;';
        } else if (isBonus) {
            badge = '🎁 BONUS';
            badgeStyle = 'background:rgba(255,215,0,0.2); color:#FFD700; border:1px solid #FFD700; padding:4px 8px; border-radius:6px; font-weight:bold;';
        } else {
            badge = 'ACTIVE';
            badgeStyle = 'color:#10b981; font-weight:bold;';
        }
        
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info">
                <h4>${m.name}</h4>
                <p>⚡ ${m.rate} GH/s ${isFree ? '• 30min' : ''}</p>
            </div>
            <div class="ci-action">
                <span style="${badgeStyle}">${badge}</span>
            </div>
        </div>`;
    });
}

async function renderHistory() {
    const listEl = document.getElementById('tx-history-list');
    if (!listEl) return;

    if (!state.wallet) {
        listEl.innerHTML = "<p style='color:#666'>Connect wallet</p>";
        return;
    }

    listEl.innerHTML = "<p style='color:#999'>Loading...</p>";
    const history = await getHistoryFromFire(state.wallet);

    if (history.length === 0) {
        listEl.innerHTML = "<p style='color:#666'>No transactions</p>";
        return;
    }

    let html = "";
    history.forEach(tx => {
        const date = new Date(tx.requestDate).toLocaleString();
        const color = tx.status === 'pending' ? 'orange' : (tx.status === 'paid' ? '#10b981' : '#ff453a');
        const statusText = tx.status === 'pending' ? 'pending' : (tx.status === 'paid' ? 'paid' : 'rejected');

        html += `
        <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between;">
            <div>
                <div style="font-weight: bold; color: #fff;">-${tx.amount} TON</div>
                <div style="font-size: 0.75rem; color: #888;">${date}</div>
            </div>
            <div style="color: ${color}; font-size: 0.85rem; font-weight: bold;">
                ${statusText}
            </div>
        </div>`;
    });

    listEl.innerHTML = html;
}

// --- REFERRAL ---
async function initReferralCode(walletAddress) {
    if (!walletAddress) return;
    const code = 'REF' + walletAddress.substring(2, 10).toUpperCase();
    state.referralCode = code;
    await saveReferralCode(walletAddress, code);
    updateReferralUI();
}

function updateReferralUI() {
    const refCodeInput = document.getElementById('ref-code');
    const refLinkInput = document.getElementById('ref-link');
    const refCountEl = document.getElementById('ref-count');
    const refEarningsEl = document.getElementById('ref-earnings');
    const refStatusBadge = document.getElementById('refStatusBadge');
    const refByCode = document.getElementById('refByCode');
    
    if (refCodeInput && state.referralCode) {
        refCodeInput.value = state.referralCode;
    }
    
    if (refLinkInput && state.referralCode) {
        refLinkInput.value = `https://t.me/${BOT_USERNAME}?start=${state.referralCode}`;
    }
    
    if (refCountEl) {
        refCountEl.textContent = state.referralCount || 0;
    }
    
    if (refEarningsEl) {
        refEarningsEl.textContent = (state.referralEarnings || 0).toFixed(2);
    }
    
    if (refStatusBadge && refByCode && state.referredBy) {
        refStatusBadge.style.display = 'block';
        refByCode.textContent = state.referredBy.substring(0, 12) + '...';
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
        listEl.innerHTML = "<p style='color:#666'>No referrals yet</p>";
        return;
    }
    
    let html = "";
    stats.history.forEach(ref => {
        const date = new Date(ref.date).toLocaleString('tr-TR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const buyerShort = ref.buyerWallet.substring(0, 6) + '...' + ref.buyerWallet.substring(ref.buyerWallet.length - 4);
        
        html += `
        <div style="background: rgba(16,185,129,0.1); padding: 10px; margin-bottom: 8px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
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
    if (!state.referralCode) {
        showToast("Connect wallet!", true);
        return;
    }
    
    const refCodeInput = document.getElementById('ref-code');
    if (refCodeInput) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(refCodeInput.value).then(() => {
                showToast("✅ Code copied!", false);
                if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            }).catch(() => {
                refCodeInput.select();
                document.execCommand('copy');
                showToast("✅ Code copied!", false);
            });
        } else {
            refCodeInput.select();
            refCodeInput.setSelectionRange(0, 99999);
            document.execCommand('copy');
            showToast("✅ Code copied!", false);
        }
    }
}

function shareReferralLink() {
    if (!state.referralCode) {
        showToast("Connect wallet!", true);
        return;
    }
    
    const shareUrl = `https://t.me/${BOT_USERNAME}?start=${state.referralCode}`;
    const shareText = `🚀 Join TON Pro Miner!\n\n💰 Earn crypto mining\n🎁 Code: ${state.referralCode}\n🎁 Get FREE Basic Chip!\n\n${shareUrl}`;
    
    if (tg) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    } else {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => showToast("✅ Link copied!", false));
        } else {
            const refLinkInput = document.getElementById('ref-link');
            if (refLinkInput) {
                refLinkInput.select();
                document.execCommand('copy');
                showToast("✅ Link copied!", false);
            }
        }
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
    
    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(err ? 'error' : 'success');
    }
}

init();
