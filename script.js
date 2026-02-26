// --- IMPORT ---
import { saveUserToFire, getUserFromFire, initAuth, getHistoryFromFire, saveReferralCode, registerReferral, addReferralCommission, getReferralStats } from './firebase-config.js';
import { t, currentLang, setLanguage, getAvailableLanguages } from './lang.js';

// --- TELEGRAM WEBAPP ---
let tg = null;
try {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        if (tg.themeParams && tg.themeParams.bg_color) {
            document.body.style.backgroundColor = tg.themeParams.bg_color;
        }
        if (tg.BackButton) {
            tg.BackButton.hide();
        }
        console.log("✅ Telegram WebApp ready, version:", tg.version);
    } else {
        console.warn("⚠️ Telegram WebApp SDK bulunamadı - tarayıcı modunda çalışıyor");
    }
} catch (e) {
    console.error("❌ Telegram WebApp init hatası:", e);
}

// --- CONFIG ---
const CFG = { rate: 0.000001, tick: 100 };
const ADMIN_WALLET = "UQBfQpD5TFm0DlMkqZBymxBh9Uiyj1sqvdzkEvpgrgwS6gCc"; 
const BOT_USERNAME = "TonProMiner_Bot";

let tonConnectUI = null;
let currentUserUid = null;
let adsgramController = null;
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
    referralBonusReceived: false,
    totalEarned: 0,
    lastSpinTime: 0,
    loginStreak: 0,
    lastLoginDate: null
};

const machines = [
    { id: 1, name: "Nano Chip", price: 5, starPrice: 25, rate: 3, color: "#94a3b8", icon: "fa-microchip" },
    { id: 2, name: "Micro Core", price: 15, starPrice: 75, rate: 7, color: "#60a5fa", icon: "fa-memory" },
    { id: 3, name: "Basic Miner", price: 35, starPrice: 175, rate: 16, color: "#2dd4bf", icon: "fa-hammer" },
    { id: 4, name: "Dual Processor", price: 75, starPrice: 375, rate: 35, color: "#34d399", icon: "fa-microchip" },
    { id: 5, name: "Quad Engine", price: 150, starPrice: 750, rate: 69, color: "#3b82f6", icon: "fa-cogs" },
    { id: 6, name: "Hexa Unit", price: 300, starPrice: 1500, rate: 139, color: "#8b5cf6", icon: "fa-server" },
    { id: 7, name: "Quantum Node", price: 600, starPrice: 3000, rate: 278, color: "#a855f7", icon: "fa-atom" },
    { id: 8, name: "Fusion Reactor", price: 1200, starPrice: 6000, rate: 556, color: "#ec4899", icon: "fa-rocket" },
    { id: 9, name: "Dark Matter", price: 2500, starPrice: 12500, rate: 1157, color: "#f43f5e", icon: "fa-bolt" },
    { id: 10, name: "Plasma Core", price: 5000, starPrice: 25000, rate: 2315, color: "#FFD700", icon: "fa-sun" },
    { id: 999, name: "FREE Dark Matter Node", price: 0, starPrice: 0, rate: 300, color: "#ef4444", icon: "fa-server" }
];

let graphData = new Array(40).fill(12.5);

function init() {
    // Start splash progress
    animateSplash();
    
    initAuth((uid) => {
        currentUserUid = uid;
        console.log("✅ User:", uid);
    });

    loadLocalData();
    _lastKnownBalance = state.balance;
    _lastBalanceCheck = Date.now();
    
    // Calculate offline but don't show toast — store result
    const offlineResult = calculateOfflineProgress();
    
    renderMarket();
    updateUI();
    setupTonConnect();
    initAdsgram();

    setInterval(loop, CFG.tick); 
    setInterval(autoSave, 10000); 
    setInterval(graphLoop, 300);
    setInterval(termLoop, 2000);
    setInterval(checkFree, 1000);
    setInterval(updateSpinStatus, 1000);
    
    setupEventListeners();
    checkReferralPopup();
    initSpinWheel();
    updateSpinStatus();
    applyLanguage();
    checkNotificationEligibility();
    
    // Hide splash after a minimum display time, then show popups in sequence
    setTimeout(() => {
        hideSplash(() => {
            // Check onboarding first (new users)
            const onboardSeen = localStorage.getItem('tonminer_onboard');
            if (!onboardSeen) {
                checkOnboarding();
                return; // Onboarding will handle further flow
            }
            
            // After splash hides, show offline popup if earned
            if (offlineResult && offlineResult.earned > 0.001) {
                showOfflinePopup(offlineResult.earned, offlineResult.seconds);
            } else {
                // No offline earnings, check daily bonus directly
                checkDailyBonus();
            }
        });
    }, 1800);
}

function setupEventListeners() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWallet();
        });
    }
    
    const adBtn = document.querySelector('.ad-btn');
    if (adBtn) adBtn.addEventListener('click', () => watchAd());
    
    const copyBtn = document.getElementById('copy-ref-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => copyReferralCode());
    
    const shareBtn = document.getElementById('share-ref-btn');
    if (shareBtn) shareBtn.addEventListener('click', () => shareReferralLink());
}

// --- REFERRAL POPUP ---
function checkReferralPopup() {
    let refCode = null;
    
    try {
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            refCode = tg.initDataUnsafe.start_param;
        }
    } catch (e) {
        console.warn("start_param okunamadı:", e);
    }
    
    if (!refCode) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            refCode = urlParams.get('ref');
        } catch (e) {
            console.warn("URL params okunamadı:", e);
        }
    }
    
    if (refCode && !localStorage.getItem('hasUsedReferral')) {
        referralCodePending = refCode;
        localStorage.setItem('hasUsedReferral', 'applied');
        console.log('✅ Referral code detected:', refCode);
        
        const refInput = document.getElementById('refInput');
        if (refInput) {
            refInput.value = refCode;
        }
    }
}

function showRefPopup() {}
function hideRefPopup() {}
window.skipReferral = function() {}

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
    
    const hasUsedRef = localStorage.getItem('hasUsedReferral');
    if (hasUsedRef && hasUsedRef !== 'skipped') {
        showToast("You already used a referral code!", true);
        return;
    }
    
    referralCodePending = code;
    localStorage.setItem('hasUsedReferral', 'applied');
    
    if (state.wallet && !state.referredBy) {
        await applyPendingReferral(state.wallet);
    } else {
        showToast("✅ Code saved! Connect wallet to activate", false);
    }
    
    refInput.value = '';
}

// --- DATA MANAGEMENT ---
function loadLocalData() {
    try {
        const saved = localStorage.getItem('tonMinerSave');
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            state.wallet = null; 
        }
    } catch (e) { 
        console.error("Corrupted save:", e); 
    }
}

function saveLocalData() {
    try {
        state.lastSave = Date.now();
        localStorage.setItem('tonMinerSave', JSON.stringify(state));
    } catch (e) {
        console.error("Save error:", e);
    }
}

function autoSave() {
    saveLocalData();
}

async function syncToServer() {
    if (!state.wallet || !currentUserUid) return;
    
    try {
        // --- BALANCE INTEGRITY CHECK ---
        // Calculate maximum possible balance based on inventory
        let maxHashrate = 0;
        state.inv.forEach(item => {
            const m = machines.find(x => x.id === item.id);
            if (m) maxHashrate += m.rate;
        });
        // Add free node if active
        if (state.freeEnd > Date.now()) maxHashrate += 300;
        
        // If client hashrate exceeds inventory, it's been tampered
        if (state.hashrate > maxHashrate + 10) {
            console.error("⚠️ Hashrate integrity violation! Resetting.");
            state.hashrate = maxHashrate;
        }

        // Cap balance growth rate — max possible daily earning
        // This prevents console balance manipulation from being synced
        const maxDailyEarning = maxHashrate * CFG.rate * 86400;
        const lastSync = parseInt(localStorage.getItem('lastSyncTime')) || Date.now();
        const hoursSinceSync = (Date.now() - lastSync) / (1000 * 3600);
        const maxEarningSinceSync = (maxDailyEarning / 24) * Math.max(hoursSinceSync, 0.01) * 1.1; // 10% buffer only
        
        const lastSyncedBalance = parseFloat(localStorage.getItem('lastSyncedBalance')) || state.balance;
        const balanceGrowth = state.balance - lastSyncedBalance;
        
        // Strict check: growth cannot exceed mining capacity + small buffer for spin/bonus
        const maxAllowedGrowth = maxEarningSinceSync + 2; // +2 TON buffer for spin/daily bonus
        if (balanceGrowth > maxAllowedGrowth && maxHashrate > 0 && hoursSinceSync < 2) {
            console.error(`⚠️ Balance growth suspicious! Growth: ${balanceGrowth.toFixed(2)}, Max: ${maxAllowedGrowth.toFixed(2)}`);
            state.balance = lastSyncedBalance + maxEarningSinceSync + 2;
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
            referralEarnings: state.referralEarnings,
            referralLocked: state.referralLocked,
            referralBonusReceived: state.referralBonusReceived,
            totalEarned: state.totalEarned,
            lastSpinTime: state.lastSpinTime,
            loginStreak: state.loginStreak,
            lastLoginDate: state.lastLoginDate
        };
        await saveUserToFire(state.wallet, dataToSave);
        
        // Track last synced values for integrity checking
        localStorage.setItem('lastSyncTime', Date.now().toString());
        localStorage.setItem('lastSyncedBalance', state.balance.toString());
    } catch (e) {
        console.error("Sync error:", e);
    }
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
    
    try {
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
            state.totalEarned = serverData.totalEarned || 0;
            state.lastSpinTime = serverData.lastSpinTime || 0;
            state.loginStreak = serverData.loginStreak || 0;
            state.lastLoginDate = serverData.lastLoginDate || null;
            
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
    } catch (e) {
        console.error("Load server data error:", e);
        showToast("Sync failed", true);
    }
}

async function applyPendingReferral(walletAddress) {
    if (!referralCodePending) return;
    
    showToast("Activating referral...", false);
    
    try {
        const success = await registerReferral(walletAddress, referralCodePending);
        
        if (success) {
            state.referredBy = referralCodePending;
            state.referralLocked = true;
            
            if (!state.referralBonusReceived) {
                grantReferralBonus();
            }
            
            showToast("✅ Referral + FREE machine!", false);
            updateReferralUI();
            syncToServer();
        } else {
            showToast("❌ Invalid or used code!", true);
        }
    } catch (e) {
        console.error("Referral error:", e);
        showToast("Referral failed", true);
    }
    
    referralCodePending = null;
}

function grantReferralBonus() {
    const basicChip = machines.find(m => m.id === 1);
    if (!basicChip) return;
    
    state.inv.push({ mid: 1, uid: Date.now(), bonus: true });
    state.hashrate += basicChip.rate;
    state.referralBonusReceived = true;
    
    saveLocalData();
    syncToServer();
    updateUI();
    drawChart();
    renderInv();
    
    setTimeout(() => {
        showToast("🎁 +5 GH/s Basic Chip!", false);
    }, 1000);
}

function calculateOfflineProgress() {
    if (!state.lastSave || state.hashrate === 0) return null;
    const now = Date.now();
    const secondsPassed = (now - state.lastSave) / 1000;
    
    if (secondsPassed > 30) {
        const earned = secondsPassed * state.hashrate * CFG.rate;
        if (earned > 0) {
            state.balance += earned;
            state.totalEarned += earned;
            syncToServer();
            return { earned, seconds: secondsPassed };
        }
    }
    return null;
}

// --- ADSGRAM ---
function initAdsgram() {
    const BLOCK_ID = "22343";
    let retries = 0;
    const maxRetries = 50;
    
    const check = setInterval(() => {
        retries++;
        if (retries > maxRetries) {
            clearInterval(check);
            console.warn("⚠️ Adsgram yüklenemedi");
            return;
        }
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
    let retries = 0;
    const maxRetries = 100;
    
    const check = setInterval(async () => {
        retries++;
        if (retries > maxRetries) {
            clearInterval(check);
            console.error("❌ TonConnect SDK yüklenemedi");
            return;
        }
        
        if (typeof window.TON_CONNECT_UI !== 'undefined') {
            clearInterval(check);
            try {
                tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
                    manifestUrl: window.location.origin + '/tonconnect-manifest.json'
                });

                tonConnectUI.onStatusChange(async (walletInfo) => {
                    if (walletInfo && walletInfo.account) {
                        const address = walletInfo.account.address;
                        state.wallet = address;
                        
                        const btn = document.getElementById('connectBtn');
                        if (btn) {
                            btn.innerHTML = '<i class="fas fa-wallet"></i> ' + address.substring(0,6) + '...' + address.substring(address.length-4);
                            btn.classList.add('connected');
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
                        if (btn) {
                            btn.innerHTML = '<i class="fas fa-wallet"></i> Connect';
                            btn.classList.remove('connected');
                        }
                        
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
    if (!tonConnectUI) {
        showToast("Wallet loading...", true);
        return;
    }
    
    try {
        if (tonConnectUI.connected) {
            await tonConnectUI.disconnect();
        } else {
            await tonConnectUI.openModal();
        }
    } catch (e) {
        console.error("Wallet toggle error:", e);
        showToast("Wallet error", true);
    }
}

// --- GAME LOOP ---
// --- BALANCE INTEGRITY ---
let _lastKnownBalance = 0;
let _lastBalanceCheck = Date.now();

function checkBalanceIntegrity() {
    // If balance jumped more than possible since last check, flag it
    const now = Date.now();
    const secondsSinceCheck = (now - _lastBalanceCheck) / 1000;
    const maxPossibleEarning = state.hashrate * CFG.rate * secondsSinceCheck * 1.5; // 50% buffer
    const growth = state.balance - _lastKnownBalance;
    
    if (_lastKnownBalance > 0 && growth > maxPossibleEarning + 5 && secondsSinceCheck < 60) {
        console.warn("⚠️ Balance integrity violation detected. Reverting.");
        state.balance = _lastKnownBalance + (state.hashrate * CFG.rate * secondsSinceCheck);
        state.totalEarned = Math.min(state.totalEarned, state.balance + 100);
    }
    
    _lastKnownBalance = state.balance;
    _lastBalanceCheck = now;
}

function loop() {
    if (state.hashrate > 0) {
        const earned = state.hashrate * CFG.rate * (CFG.tick/1000);
        state.balance += earned;
        state.totalEarned += earned;
        updateUI();
    }
    // Periodic integrity check (every ~5 seconds)
    if (Math.random() < 0.2) checkBalanceIntegrity();
}

function updateUI() {
    const totalBal = document.getElementById('totalBal');
    const dHash = document.getElementById('d-hash');
    const dCount = document.getElementById('d-count');
    const dDaily = document.getElementById('d-daily');
    
    if (totalBal) totalBal.textContent = state.balance.toFixed(6);
    if (dHash) dHash.textContent = state.hashrate;
    if (dCount) dCount.textContent = state.inv.length;
    
    const daily = (state.hashrate * CFG.rate * 86400).toFixed(2);
    if (dDaily) dDaily.textContent = daily;
    
    // Dashboard referral stats
    const dashRef = document.getElementById('dashRefCount');
    const dashRefEarn = document.getElementById('dashRefEarn');
    if (dashRef) dashRef.textContent = state.referralCount || 0;
    if (dashRefEarn) dashRefEarn.textContent = (state.referralEarnings || 0).toFixed(2);
    
    // Dashboard task badge
    const claimable = getClaimableTaskCount();
    const badge = document.getElementById('dashTaskBadge');
    if (badge) {
        if (claimable > 0) {
            badge.style.display = 'block';
            badge.textContent = claimable;
        } else {
            badge.style.display = 'none';
        }
    }
    
    updateRankBadge();
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
            if (freeMachine) {
                state.hashrate = Math.max(0, state.hashrate - freeMachine.rate);
            }
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
        await adsgramController.show().then(async () => {
            // Ad watched successfully — validate on server
            if (state.wallet && currentUserUid) {
                try {
                    const response = await fetch('/api/free-node', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ walletAddress: state.wallet, userId: currentUserUid })
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        state.freeEnd = data.freeEnd;
                        state.lastAdTime = Date.now();
                        state.hashrate += 300;
                        state.inv.push({ mid: 999, uid: Date.now(), bonus: false });
                        saveLocalData();
                        updateUI();
                        drawChart();
                        renderInv();
                        showToast("✅ FREE Device!", false);
                    } else {
                        showToast("❌ " + (data.error || "Failed"), true);
                    }
                } catch(e) {
                    // Fallback for non-wallet users
                    grantMachine(999);
                    showToast("✅ FREE Device!", false);
                }
            } else {
                // No wallet — grant locally
                state.lastAdTime = Date.now();
                grantMachine(999);
                showToast("✅ FREE Device!", false);
                saveLocalData();
            }
        }).catch(() => {
            showToast("Ad cancelled", true);
        });
    } catch (err) {
        console.error("Ad error:", err);
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
        await buyWithStars(id);
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
                // Extract tx hash for replay protection
                let txHash = null;
                try {
                    if (result.boc) txHash = result.boc.substring(0, 64);
                } catch(e) {}
                
                // SERVER-SIDE VALIDATION — grant machine only after server confirms
                showToast("Verifying...", false);
                const response = await fetch('/api/validate-purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: state.wallet,
                        userId: currentUserUid,
                        machineId: id,
                        txHash: txHash || `TX_${Date.now()}`
                    })
                });
                const data = await response.json();
                
                if (data.success) {
                    // Update local state from server
                    state.inv.push({ mid: id, uid: Date.now(), bonus: false });
                    state.hashrate = data.newHashrate;
                    saveLocalData();
                    updateUI();
                    drawChart();
                    renderInv();
                    
                    // Referral commission
                    if (state.wallet && m.price > 0) {
                        try { await addReferralCommission(state.wallet, m.price); } catch(e) {}
                    }
                    
                    showToast(`✅ ${m.name}!`, false);
                } else {
                    showToast("❌ " + (data.error || "Verification failed"), true);
                }
            }
        } catch (err) {
            console.error("Transaction error:", err);
            showToast("Cancelled", true);
        }
    }
}

async function buyWithStars(id) {
    const m = machines.find(x => x.id === id);
    if (!m) {
        showToast("Machine not found", true);
        return;
    }
    
    if (!tg) {
        showToast("Telegram required for Stars payment", true);
        return;
    }
    
    try {
        showToast("Opening...", false);
        const invoiceLink = await createStarsInvoice(id, m.starPrice);
        
        if (!invoiceLink) {
            showToast("Invoice creation failed", true);
            return;
        }
        
        tg.openInvoice(invoiceLink, async (status) => {
            if (status === 'paid') {
                // Server-side validation for Stars too
                try {
                    const response = await fetch('/api/validate-purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            walletAddress: state.wallet || 'stars_' + (tg.initDataUnsafe?.user?.id || Date.now()),
                            userId: currentUserUid,
                            machineId: id,
                            txHash: `STARS_${Date.now()}_${id}`
                        })
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        state.inv.push({ mid: id, uid: Date.now(), bonus: false });
                        state.hashrate = data.newHashrate;
                        saveLocalData();
                        updateUI();
                        drawChart();
                        renderInv();
                        if (state.wallet && m.price > 0) {
                            try { await addReferralCommission(state.wallet, m.price); } catch(e) {}
                        }
                        showToast(`✅ ${m.name}!`, false);
                    } else {
                        showToast("❌ " + (data.error || "Failed"), true);
                    }
                } catch(e) {
                    // Fallback: grant locally if server unreachable
                    await grantMachine(id);
                    showToast(`✅ ${m.name}!`, false);
                }
            } else if (status === 'cancelled') {
                showToast("Cancelled", true);
            } else {
                showToast("Payment: " + status, true);
            }
        });
    } catch (err) {
        console.error("Stars purchase error:", err);
        showToast("Failed", true);
    }
}

async function createStarsInvoice(machineId, starAmount) {
    const API_URL = window.location.origin + '/api/create-invoice';
    
    let userId = 'unknown';
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        userId = tg.initDataUnsafe.user.id.toString();
    }
    
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
        
        if (state.wallet && m.price > 0) {
            try {
                await addReferralCommission(state.wallet, m.price);
            } catch (e) {
                console.log('Referral commission error:', e);
            }
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
        showToast(t('connectFirst'), true);
        return;
    }

    if (!amountStr || parseFloat(amountStr) <= 0) {
        showToast(t('invalidAmount'), true);
        return;
    }

    const amount = parseFloat(amountStr);

    if (amount < 100) {
        showToast(t('minRequired'), true);
        return;
    }

    if (amount > state.balance) {
        showToast(t('noBalance'), true);
        return;
    }

    try {
        showToast("Processing...", false);
        
        // --- SERVER-SIDE VALIDATED WITHDRAWAL ---
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress: state.wallet,
                amount: amount,
                userId: currentUserUid
            })
        });

        const result = await response.json();

        if (result.success) {
            // Update local state from server-confirmed balance
            state.balance = result.newBalance;
            saveLocalData();
            updateUI();
            inputElement.value = '';
            showToast("✅ Requested!", false);
            showProcessingSection(result.amount);
            setTimeout(() => renderHistory(), 500);
        } else {
            showToast("❌ " + (result.error || "Failed!"), true);
        }
    } catch (error) {
        console.error("Withdraw error:", error);
        showToast("Error! Try again.", true);
    }
}

function showProcessingSection(amount) {
    const processingSection = document.getElementById('processing-section');
    const amountDisplay = document.getElementById('withdrawal-ton-amount');
    
    if (!processingSection) return;
    
    if (amountDisplay) {
        amountDisplay.textContent = amount.toFixed(2);
    }
    
    processingSection.style.display = 'block';
    
    setTimeout(() => {
        processingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// --- NAV ---
function go(id, el) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    
    const targetView = document.getElementById('v-'+id);
    if (targetView) {
        targetView.classList.add('active');
    }
    
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
    if(id==='tasks') {
        renderTasks();
    }
}

window.goTo = function(id, el) {
    go(id, el);
};

// --- CHART ---
function drawChart() {
    const container = document.getElementById('chartSegments');
    if (!container) return;
    container.innerHTML = '';

    // Count machines by type
    const machineCount = {};
    state.inv.forEach(i => {
        if (!machineCount[i.mid]) machineCount[i.mid] = 0;
        machineCount[i.mid]++;
    });

    const total = state.inv.reduce((sum, i) => {
        const m = machines.find(x => x.id === i.mid);
        return sum + (m?.rate || 0);
    }, 0);

    if (total === 0) return;

    let currentAngle = 0;

    // Group by machine type
    const grouped = {};
    state.inv.forEach(i => {
        const m = machines.find(x => x.id === i.mid);
        if (!m) return;
        if (!grouped[m.id]) grouped[m.id] = { machine: m, count: 0, totalRate: 0 };
        grouped[m.id].count++;
        grouped[m.id].totalRate += m.rate;
    });

    Object.values(grouped).forEach(g => {
        const percentage = g.totalRate / total;
        const angle = percentage * 360;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const largeArcFlag = angle > 180 ? 1 : 0;

        const startX = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
        const startY = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
        const endX = 50 + 40 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
        const endY = 50 + 40 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);

        path.setAttribute("d", `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`);
        path.setAttribute("fill", g.machine.color);
        path.setAttribute("opacity", "0.85");
        path.setAttribute("style", "cursor:pointer;");
        
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            showMachinePopup(g.machine, g.count, g.totalRate);
        });

        container.appendChild(path);
        currentAngle += angle;
    });
}

function showMachinePopup(machine, count, totalRate) {
    // Remove existing popup
    const old = document.getElementById('machinePopup');
    if (old) old.remove();
    
    const daily = (totalRate * CFG.rate * 86400).toFixed(2);
    
    const popup = document.createElement('div');
    popup.id = 'machinePopup';
    popup.innerHTML = `
        <div style="background:rgba(21,40,68,0.97); border:1.5px solid ${machine.color}; border-radius:16px; padding:16px; max-width:260px; margin:0 auto; box-shadow:0 10px 40px rgba(0,0,0,0.5); position:relative;">
            <button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;">✕</button>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:36px;height:36px;border-radius:10px;background:${machine.color}22;border:1px solid ${machine.color};display:flex;align-items:center;justify-content:center;color:${machine.color};"><i class="fas ${machine.icon}"></i></div>
                <div>
                    <div style="font-weight:700;color:#fff;font-size:0.95rem;">${machine.name}</div>
                    <div style="font-size:0.7rem;color:${machine.color};">${count}x Active</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px;text-align:center;">
                    <div style="font-size:0.6rem;color:var(--text-muted);">Total GH/s</div>
                    <div style="font-weight:700;color:${machine.color};font-size:1rem;">${totalRate}</div>
                </div>
                <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px;text-align:center;">
                    <div style="font-size:0.6rem;color:var(--text-muted);">Daily TON</div>
                    <div style="font-weight:700;color:var(--success);font-size:1rem;">${daily}</div>
                </div>
            </div>
        </div>
    `;
    popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);padding:20px;animation:fadeIn 0.2s ease;';
    popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
    document.body.appendChild(popup);
}

// --- GRAPH ---
let graphPhase = 0;

function graphLoop() {
    const card = document.getElementById('liveGraphCard');
    const line = document.getElementById('liveLine');
    const fill = document.getElementById('liveFill');
    const dot = document.getElementById('liveDot');
    const statusEl = document.getElementById('networkStatus');
    const statsEl = document.getElementById('lgStats');
    const lgHash = document.getElementById('lgHash');

    if (!line || !card) return;

    const isActive = state.hashrate > 0;

    // Toggle active state
    if (isActive) {
        card.classList.add('active');
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--success)">${t('mining')}</span>`;
        if (statsEl) statsEl.style.display = 'flex';
        if (lgHash) lgHash.textContent = state.hashrate;
    } else {
        card.classList.remove('active');
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--text-muted)">${t('offline')}</span>`;
        if (statsEl) statsEl.style.display = 'none';
    }

    // Generate smooth data point
    if (isActive) {
        graphPhase += 0.15;
        const base = 12 + Math.sin(graphPhase) * 3;
        const noise = (Math.random() - 0.5) * 2;
        const prev = graphData[graphData.length - 1];
        const val = prev * 0.6 + (base + noise) * 0.4; // smooth blend
        graphData.shift();
        graphData.push(Math.max(2, Math.min(23, val)));
    } else {
        // Flatline when offline
        const prev = graphData[graphData.length - 1];
        const val = prev * 0.95 + 12.5 * 0.05;
        graphData.shift();
        graphData.push(val);
    }

    // Draw smooth line
    const points = graphData.map((v, i) => {
        const x = (i / (graphData.length - 1)) * 100;
        const y = 25 - v;
        return `${x},${y.toFixed(1)}`;
    }).join(' ');

    line.setAttribute('points', points);

    // Draw fill polygon
    if (fill) {
        const fillPoints = `0,25 ${points} 100,25`;
        fill.setAttribute('points', fillPoints);
    }

    // Move dot to last point
    if (dot) {
        const lastVal = graphData[graphData.length - 1];
        dot.setAttribute('cy', (25 - lastVal).toFixed(1));
    }
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
        let roi = (m.price / (m.rate * CFG.rate * 86400)).toFixed(0);
        l.innerHTML += `
        <div class="card-item">
            <div class="ci-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>
            <div class="ci-info">
                <h4>${m.name}</h4>
                <p>+${m.rate} GH/s • ${daily} ${t('tonDay')}</p>
                <p style="color:${m.color};font-size:0.65rem;">${t('roi')}: ~${roi} ${t('days')}</p>
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
        l.innerHTML = `<div style='text-align:center; color:#666'>${t('empty')}</div>`;
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
            badgeStyle = 'background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid #ef4444; padding:5px 10px; border-radius:8px; font-weight:bold;';
        } else if (isBonus) {
            badge = '🎁 BONUS';
            badgeStyle = 'background:rgba(255,215,0,0.2); color:#FFD700; border:1.5px solid #FFD700; padding:5px 10px; border-radius:8px; font-weight:bold;';
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
    
    try {
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
    } catch (e) {
        console.error("History error:", e);
        listEl.innerHTML = "<p style='color:#666'>Failed to load</p>";
    }
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
    
    try {
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
    } catch (e) {
        console.error("Referral history error:", e);
        listEl.innerHTML = "<p style='color:#666'>Failed to load</p>";
    }
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
                fallbackCopy(refCodeInput);
            });
        } else {
            fallbackCopy(refCodeInput);
        }
    }
}

function fallbackCopy(inputEl) {
    try {
        inputEl.select();
        inputEl.setSelectionRange(0, 99999);
        document.execCommand('copy');
        showToast("✅ Code copied!", false);
    } catch (e) {
        showToast("Copy failed", true);
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
        try {
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        } catch (e) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => showToast("✅ Link copied!", false));
            }
        }
    } else {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => showToast("✅ Link copied!", false));
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
    
    try {
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred(err ? 'error' : 'success');
        }
    } catch (e) {}
}

// --- RANK SYSTEM ---
const RANKS = [
    { name: 'Bronze', min: 0, max: 50, color: '#cd7f32', icon: 'fa-medal', bg: 'rgba(205,127,50,0.15)' },
    { name: 'Silver', min: 50, max: 200, color: '#C0C0C0', icon: 'fa-medal', bg: 'rgba(192,192,192,0.15)' },
    { name: 'Gold', min: 200, max: 1000, color: '#FFD700', icon: 'fa-crown', bg: 'rgba(255,215,0,0.15)' },
    { name: 'Diamond', min: 1000, max: 5000, color: '#00BFFF', icon: 'fa-gem', bg: 'rgba(0,191,255,0.15)' },
    { name: 'Legendary', min: 5000, max: Infinity, color: '#d946ef', icon: 'fa-star', bg: 'rgba(217,70,239,0.15)' }
];

function getRank(totalEarned) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalEarned >= RANKS[i].min) return { ...RANKS[i], index: i };
    }
    return { ...RANKS[0], index: 0 };
}

function updateRankBadge() {
    const rank = getRank(state.totalEarned);
    const iconEl = document.getElementById('rankIcon');
    const nameEl = document.getElementById('rankName');
    const fillEl = document.getElementById('rankFill');
    const subEl = document.getElementById('rankSub');
    
    if (!iconEl || !nameEl) return;
    
    iconEl.innerHTML = `<i class="fas ${rank.icon}"></i>`;
    iconEl.style.color = rank.color;
    iconEl.style.borderColor = rank.color;
    iconEl.style.background = rank.bg;
    
    nameEl.textContent = rank.name;
    nameEl.style.color = rank.color;
    
    if (fillEl) {
        fillEl.style.background = `linear-gradient(90deg, ${rank.color}, ${rank.color}88)`;
        if (rank.max === Infinity) {
            fillEl.style.width = '100%';
        } else {
            const progress = ((state.totalEarned - rank.min) / (rank.max - rank.min)) * 100;
            fillEl.style.width = Math.min(100, Math.max(0, progress)) + '%';
        }
    }
    
    if (subEl) {
        if (rank.max === Infinity) {
            subEl.textContent = `${state.totalEarned.toFixed(1)} TON earned — MAX RANK`;
        } else {
            const nextRank = RANKS[rank.index + 1];
            subEl.textContent = `${state.totalEarned.toFixed(1)} / ${rank.max} TON to ${nextRank.name}`;
        }
    }
}

// --- SPIN WHEEL ---
const SPIN_SEGMENTS = [
    { label: '0.01', value: 0.01, color: '#2563eb' },
    { label: '0.05', value: 0.05, color: '#059669' },
    { label: '0.10', value: 0.10, color: '#7c3aed' },
    { label: '0.50', value: 0.50, color: '#dc2626' },
    { label: '0.02', value: 0.02, color: '#0891b2' },
    { label: '0.25', value: 0.25, color: '#d97706' },
    { label: '0.03', value: 0.03, color: '#0d9488' },
    { label: '1.00', value: 1.00, color: '#ca8a04' }
];

const SPIN_WEIGHTS = [30, 20, 15, 5, 20, 6, 12, 2]; // weighted probability

let spinAngle = 0;
let isSpinning = false;

function initSpinWheel() {
    drawWheel(0);
}

function drawWheel(rotation) {
    const canvas = document.getElementById('spinCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = cx - 8;
    const innerR = 32;
    const segCount = SPIN_SEGMENTS.length;
    const segAngle = (2 * Math.PI) / segCount;
    
    ctx.clearRect(0, 0, size, size);
    
    // --- Draw segments ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    
    SPIN_SEGMENTS.forEach((seg, i) => {
        const startA = i * segAngle;
        const endA = startA + segAngle;
        
        // Segment fill with gradient
        const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
        grad.addColorStop(0, lightenColor(seg.color, 30));
        grad.addColorStop(0.7, seg.color);
        grad.addColorStop(1, darkenColor(seg.color, 20));
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, outerR, startA, endA);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Segment border
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Inner highlight line
        ctx.beginPath();
        ctx.moveTo(
            Math.cos(startA) * (innerR + 5),
            Math.sin(startA) * (innerR + 5)
        );
        ctx.lineTo(
            Math.cos(startA) * (outerR - 3),
            Math.sin(startA) * (outerR - 3)
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // --- Prize text ---
        ctx.save();
        ctx.rotate(startA + segAngle / 2);
        
        // TON amount
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(seg.label, outerR * 0.62, -3);
        
        // Small "TON" label
        ctx.font = '600 8px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.shadowBlur = 0;
        ctx.fillText('TON', outerR * 0.62, 9);
        
        ctx.restore();
    });
    
    // --- Outer ring dots ---
    for (let i = 0; i < segCount * 3; i++) {
        const a = (i / (segCount * 3)) * Math.PI * 2;
        const dotR = outerR - 6;
        const dx = Math.cos(a) * dotR;
        const dy = Math.sin(a) * dotR;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.15)';
        ctx.fill();
    }
    
    ctx.restore();
    
    // --- Center hub ---
    // Shadow
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    
    // Outer ring
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    hubGrad.addColorStop(0, '#2a3f5f');
    hubGrad.addColorStop(0.8, '#152844');
    hubGrad.addColorStop(1, '#0f1e33');
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner gold ring
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText('SPIN', cx, cy - 5);
    ctx.font = '600 8px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('& WIN', cx, cy + 7);
}

function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
    return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#',''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(2.55 * percent));
    return `rgb(${r},${g},${b})`;
}

function getWeightedSegment() {
    const totalWeight = SPIN_WEIGHTS.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < SPIN_WEIGHTS.length; i++) {
        rand -= SPIN_WEIGHTS[i];
        if (rand <= 0) return i;
    }
    return 0;
}

window.openSpinWheel = function() {
    const modal = document.getElementById('spinModal');
    if (modal) {
        modal.style.display = 'flex';
        drawWheel(spinAngle);
        updateSpinButton();
    }
}

window.closeSpinWheel = function() {
    const modal = document.getElementById('spinModal');
    if (modal) modal.style.display = 'none';
}

function canSpin() {
    if (!state.lastSpinTime) return true;
    return (Date.now() - state.lastSpinTime) >= 24 * 60 * 60 * 1000;
}

function updateSpinButton() {
    const btn = document.getElementById('spinBtn');
    const timer = document.getElementById('spinTimer');
    const result = document.getElementById('spinResult');
    
    if (!btn) return;
    
    if (canSpin() && !isSpinning) {
        btn.style.display = 'flex';
        btn.disabled = false;
        if (timer) timer.style.display = 'none';
        if (result) result.style.display = 'none';
    } else if (isSpinning) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
    } else {
        btn.style.display = 'none';
        if (timer) timer.style.display = 'flex';
    }
}

function updateSpinStatus() {
    const statusEl = document.getElementById('spinStatus');
    const badgeEl = document.getElementById('spinBadge');
    const countdownEl = document.getElementById('spinCountdown');
    
    if (canSpin()) {
        if (statusEl) statusEl.textContent = 'Spin to win free TON!';
        if (badgeEl) {
            badgeEl.textContent = 'FREE';
            badgeEl.style.color = '#FFD700';
            badgeEl.style.borderColor = '#FFD700';
            badgeEl.style.background = 'rgba(255,215,0,0.2)';
        }
    } else {
        const remaining = 24 * 60 * 60 * 1000 - (Date.now() - state.lastSpinTime);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        
        if (statusEl) statusEl.textContent = `Next spin in ${timeStr}`;
        if (badgeEl) {
            badgeEl.textContent = timeStr;
            badgeEl.style.color = 'var(--text-muted)';
            badgeEl.style.borderColor = 'rgba(255,255,255,0.2)';
            badgeEl.style.background = 'rgba(255,255,255,0.05)';
        }
        if (countdownEl) countdownEl.textContent = timeStr;
    }
    
    updateSpinButton();
}

window.doSpin = async function() {
    if (!canSpin() || isSpinning) return;
    
    isSpinning = true;
    updateSpinButton();
    
    let winIndex, prize, newBalance;
    let serverOk = false;
    
    // Try server first (if wallet connected)
    if (state.wallet && currentUserUid) {
        try {
            const resp = await fetch('/api/spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: state.wallet, userId: currentUserUid })
            });
            const data = await resp.json();
            if (data.success) {
                winIndex = data.winIndex;
                prize = data.prize;
                newBalance = data.newBalance;
                serverOk = true;
            }
        } catch (e) { console.warn('Spin API fallback:', e); }
    }
    
    // Client fallback
    if (!serverOk) {
        winIndex = getWeightedSegment();
        prize = SPIN_SEGMENTS[winIndex].value;
    }
    
    // --- Animate ---
    const segAngle = 360 / SPIN_SEGMENTS.length;
    const segCenter = winIndex * segAngle + segAngle / 2;
    const targetAngle = 360 * 8 + (360 - segCenter + 270) % 360;
    const startAngle = spinAngle;
    const totalRotation = targetAngle * (Math.PI / 180);
    const startTime = Date.now();
    const duration = 5000;
    
    function easeOutBack(x) {
        const c1 = 1.2, c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        spinAngle = startAngle + totalRotation * easeOutBack(progress);
        drawWheel(spinAngle);
        
        if (progress < 0.8 && Math.floor(elapsed / 60) !== Math.floor((elapsed - 16) / 60)) {
            try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } catch(e) {}
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Animation done — apply reward
            isSpinning = false;
            state.lastSpinTime = Date.now();
            
            if (serverOk) {
                state.balance = newBalance;
            } else {
                state.balance += prize;
            }
            state.totalEarned += prize;
            
            saveLocalData();
            if (!serverOk) syncToServer();
            updateUI();
            
            const resultEl = document.getElementById('spinResult');
            const prizeEl = document.getElementById('spinPrize');
            if (resultEl) resultEl.style.display = 'block';
            if (prizeEl) prizeEl.textContent = `+${prize.toFixed(2)} TON`;
            
            const btn = document.getElementById('spinBtn');
            if (btn) btn.style.display = 'none';
            
            updateSpinButton();
            updateSpinStatus();
            showToast(`🎉 +${prize.toFixed(2)} TON!`, false);
            try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
        }
    }
    
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy'); } catch(e) {}
    requestAnimationFrame(animate);
}

// --- SPLASH SCREEN ---
function animateSplash() {
    const bar = document.getElementById('splashProgress');
    if (!bar) return;
    let progress = 0;
    const steps = [
        { to: 30, delay: 200 },
        { to: 60, delay: 600 },
        { to: 85, delay: 1000 },
        { to: 100, delay: 1500 }
    ];
    steps.forEach(s => {
        setTimeout(() => { bar.style.width = s.to + '%'; }, s.delay);
    });
}

function hideSplash(callback) {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hide');
        setTimeout(() => {
            splash.style.display = 'none';
            if (callback) callback();
        }, 500);
    } else {
        if (callback) callback();
    }
}

// --- OFFLINE EARNINGS POPUP ---
function showOfflinePopup(earned, seconds) {
    const popup = document.getElementById('offlinePopup');
    if (!popup) { checkDailyBonus(); return; }
    
    // Format time
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    let timeStr = '';
    if (hrs > 0) timeStr += hrs + 'h ';
    timeStr += mins + 'm';
    
    const titleEl = document.getElementById('offlineTitle');
    const subEl = document.getElementById('offlineSub');
    const amountEl = document.getElementById('offlineAmount');
    const timeEl = document.getElementById('offlineTime');
    
    if (titleEl) titleEl.textContent = t('offlineTitle') || 'Welcome Back!';
    if (subEl) subEl.textContent = t('offlineSub') || 'Your miners worked while you were away';
    if (amountEl) amountEl.textContent = earned.toFixed(4);
    if (timeEl) timeEl.textContent = `⏱ ${timeStr}`;
    
    popup.style.display = 'flex';
    
    try {
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch(e) {}
}

window.closeOfflinePopup = function() {
    const popup = document.getElementById('offlinePopup');
    if (popup) popup.style.display = 'none';
    // After closing offline popup, check daily bonus
    setTimeout(() => checkDailyBonus(), 300);
}

// --- DAILY LOGIN BONUS ---
const DAILY_REWARDS = [
    { day: 1, amount: 0.05, icon: '🎁' },
    { day: 2, amount: 0.10, icon: '🎁' },
    { day: 3, amount: 0.20, icon: '🎁' },
    { day: 4, amount: 0.35, icon: '💎' },
    { day: 5, amount: 0.50, icon: '💎' },
    { day: 6, amount: 0.75, icon: '💎' },
    { day: 7, amount: 1.00, icon: '👑' }
];

function getTodayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function checkDailyBonus() {
    const today = getTodayStr();
    
    console.log('📅 checkDailyBonus:', { today, lastLoginDate: state.lastLoginDate, loginStreak: state.loginStreak });
    
    // Already claimed today
    if (state.lastLoginDate === today) {
        console.log('📅 Already claimed today, skipping');
        return;
    }
    
    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth()+1).padStart(2,'0') + '-' + String(yesterday.getDate()).padStart(2,'0');
    
    let newStreak;
    if (state.lastLoginDate === yesterdayStr) {
        newStreak = Math.min((state.loginStreak || 0) + 1, 7);
    } else {
        newStreak = 1;
    }
    
    console.log('📅 Showing daily bonus popup, streak:', newStreak);
    showDailyBonusPopup(newStreak);
}

function showDailyBonusPopup(currentDay) {
    const popup = document.getElementById('dailyBonusPopup');
    if (!popup) return;
    
    const grid = document.getElementById('dailyBonusGrid');
    const streakEl = document.getElementById('dbStreak');
    const titleEl = document.getElementById('dbTitle');
    const claimTextEl = document.getElementById('dbClaimText');
    
    if (titleEl) titleEl.textContent = t('dailyReward') || 'Daily Reward';
    if (claimTextEl) claimTextEl.textContent = t('claimReward') || 'CLAIM REWARD';
    
    if (streakEl) {
        const dayLabel = (t('day') || 'Day') + ' ' + currentDay + '/7';
        streakEl.textContent = `🔥 ${dayLabel}`;
    }
    
    if (grid) {
        grid.innerHTML = '';
        DAILY_REWARDS.forEach((r, i) => {
            const dayNum = i + 1;
            let cls = 'db-day';
            
            if (dayNum < currentDay) {
                cls += ' claimed';
            } else if (dayNum === currentDay) {
                cls += ' today';
            } else {
                cls += ' locked';
            }
            
            grid.innerHTML += `
                <div class="${cls}">
                    <div class="db-day-num">${(t('day') || 'Day').substring(0,1)}${dayNum}</div>
                    <div class="db-day-icon">${dayNum < currentDay ? '✅' : r.icon}</div>
                    <div class="db-day-val">${r.amount}</div>
                </div>
            `;
        });
    }
    
    // Store pending day for claim
    popup.dataset.pendingDay = currentDay;
    
    const btn = document.getElementById('dbClaimBtn');
    if (btn) btn.disabled = false;
    
    popup.style.display = 'flex';
}

window.claimDailyBonus = async function() {
    const popup = document.getElementById('dailyBonusPopup');
    if (!popup) return;
    
    const btn = document.getElementById('dbClaimBtn');
    if (btn) btn.disabled = true;
    
    const currentDay = parseInt(popup.dataset.pendingDay) || 1;
    const reward = DAILY_REWARDS[currentDay - 1];
    if (!reward) return;
    
    let serverOk = false;
    
    // Try server if wallet connected
    if (state.wallet && currentUserUid) {
        try {
            const response = await fetch('/api/daily-bonus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: state.wallet, userId: currentUserUid })
            });
            const data = await response.json();
            if (data.success) {
                state.balance = data.newBalance;
                state.totalEarned += data.reward;
                state.loginStreak = data.streak;
                serverOk = true;
            }
        } catch (e) { console.warn('Daily bonus API fallback:', e); }
    }
    
    // Client fallback (no wallet OR server failed)
    if (!serverOk) {
        state.balance += reward.amount;
        state.totalEarned += reward.amount;
        state.loginStreak = currentDay;
    }
    
    state.lastLoginDate = getTodayStr();
    saveLocalData();
    if (!serverOk) syncToServer();
    updateUI();
    
    if (btn) btn.innerHTML = `<i class="fas fa-check"></i> +${reward.amount} TON`;
    showToast(`🎁 +${reward.amount} TON!`, false);
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    
    setTimeout(() => closeDailyBonus(), 1500);
}

window.closeDailyBonus = function() {
    const popup = document.getElementById('dailyBonusPopup');
    if (popup) popup.style.display = 'none';
}

// --- TASKS & ACHIEVEMENTS ---
const TASKS = [
    { id: 'connect_wallet', icon: '👛', color: '#3b82f6', reward: 0.10, goal: 1,
      getName: () => t('taskConnectWallet') || 'Connect Wallet',
      getDesc: () => t('taskConnectWalletDesc') || 'Connect your TON wallet',
      getProgress: () => state.wallet ? 1 : 0 },
    
    { id: 'first_machine', icon: '⛏️', color: '#8b5cf6', reward: 0.50, goal: 1,
      getName: () => t('taskFirstMachine') || 'First Machine',
      getDesc: () => t('taskFirstMachineDesc') || 'Buy your first mining machine',
      getProgress: () => state.inv.filter(i => i.mid !== 999).length >= 1 ? 1 : 0 },
    
    { id: 'buy_5_machines', icon: '🏭', color: '#06b6d4', reward: 1.00, goal: 5,
      getName: () => t('taskBuy5') || 'Machine Collector',
      getDesc: () => t('taskBuy5Desc') || 'Own 5 mining machines',
      getProgress: () => Math.min(state.inv.filter(i => i.mid !== 999).length, 5) },
    
    { id: 'buy_10_machines', icon: '🏗️', color: '#0891b2', reward: 3.00, goal: 10,
      getName: () => t('taskBuy10') || 'Mining Farm',
      getDesc: () => t('taskBuy10Desc') || 'Own 10 mining machines',
      getProgress: () => Math.min(state.inv.filter(i => i.mid !== 999).length, 10) },
    
    { id: 'first_spin', icon: '🎰', color: '#ec4899', reward: 0.10, goal: 1,
      getName: () => t('taskFirstSpin') || 'Lucky Spinner',
      getDesc: () => t('taskFirstSpinDesc') || 'Use the daily spin wheel',
      getProgress: () => state.lastSpinTime ? 1 : 0 },
    
    { id: 'watch_ad', icon: '📺', color: '#f59e0b', reward: 0.10, goal: 1,
      getName: () => t('taskWatchAd') || 'Ad Watcher',
      getDesc: () => t('taskWatchAdDesc') || 'Watch an ad for free hashrate',
      getProgress: () => state.lastAdTime ? 1 : 0 },
    
    { id: 'invite_1', icon: '👤', color: '#10b981', reward: 0.50, goal: 1,
      getName: () => t('taskInvite1') || 'First Referral',
      getDesc: () => t('taskInvite1Desc') || 'Invite 1 friend',
      getProgress: () => Math.min(state.referralCount || 0, 1) },
    
    { id: 'invite_5', icon: '👥', color: '#059669', reward: 2.00, goal: 5,
      getName: () => t('taskInvite5') || 'Team Builder',
      getDesc: () => t('taskInvite5Desc') || 'Invite 5 friends',
      getProgress: () => Math.min(state.referralCount || 0, 5) },
    
    { id: 'invite_20', icon: '🌐', color: '#047857', reward: 5.00, goal: 20,
      getName: () => t('taskInvite20') || 'Network Master',
      getDesc: () => t('taskInvite20Desc') || 'Invite 20 friends',
      getProgress: () => Math.min(state.referralCount || 0, 20) },
    
    { id: 'login_7', icon: '🔥', color: '#ef4444', reward: 1.00, goal: 7,
      getName: () => t('taskLogin7') || '7-Day Streak',
      getDesc: () => t('taskLogin7Desc') || 'Login 7 days in a row',
      getProgress: () => Math.min(state.loginStreak || 0, 7) },
    
    { id: 'earn_10', icon: '💰', color: '#eab308', reward: 1.00, goal: 10,
      getName: () => t('taskEarn10') || 'First Milestone',
      getDesc: () => t('taskEarn10Desc') || 'Earn 10 TON total',
      getProgress: () => Math.min(state.totalEarned || 0, 10) },
    
    { id: 'earn_100', icon: '💎', color: '#a855f7', reward: 5.00, goal: 100,
      getName: () => t('taskEarn100') || 'TON Whale',
      getDesc: () => t('taskEarn100Desc') || 'Earn 100 TON total',
      getProgress: () => Math.min(state.totalEarned || 0, 100) },
    
    { id: 'reach_silver', icon: '🥈', color: '#94a3b8', reward: 0.50, goal: 1,
      getName: () => t('taskSilver') || 'Silver Rank',
      getDesc: () => t('taskSilverDesc') || 'Reach Silver rank',
      getProgress: () => (state.totalEarned || 0) >= 10 ? 1 : 0 },
    
    { id: 'reach_gold', icon: '🥇', color: '#f59e0b', reward: 1.00, goal: 1,
      getName: () => t('taskGold') || 'Gold Rank',
      getDesc: () => t('taskGoldDesc') || 'Reach Gold rank',
      getProgress: () => (state.totalEarned || 0) >= 50 ? 1 : 0 },
    
    { id: 'reach_diamond', icon: '💠', color: '#06b6d4', reward: 3.00, goal: 1,
      getName: () => t('taskDiamond') || 'Diamond Rank',
      getDesc: () => t('taskDiamondDesc') || 'Reach Diamond rank',
      getProgress: () => (state.totalEarned || 0) >= 200 ? 1 : 0 }
];

function getClaimedTasks() {
    try { return JSON.parse(localStorage.getItem('tonminer_tasks') || '[]'); } catch(e) { return []; }
}
function saveClaimedTasks(arr) {
    localStorage.setItem('tonminer_tasks', JSON.stringify(arr));
}

function renderTasks() {
    const list = document.getElementById('tasksList');
    if (!list) return;
    
    const claimed = getClaimedTasks();
    let completedCount = 0;
    let totalReward = 0;
    let html = '';
    
    TASKS.forEach(task => {
        const progress = task.getProgress();
        const pct = Math.min((progress / task.goal) * 100, 100);
        const isComplete = progress >= task.goal;
        const isClaimed = claimed.includes(task.id);
        
        if (isClaimed) { completedCount++; totalReward += task.reward; }
        
        let statusHtml;
        if (isClaimed) {
            statusHtml = `<span class="task-claimed-badge">✅</span>`;
        } else if (isComplete) {
            statusHtml = `<button class="task-claim-btn" onclick="claimTask('${task.id}')">CLAIM</button>`;
        } else {
            statusHtml = `<span class="task-reward-val" style="color:#FFD700;">+${task.reward}</span><span style="font-size:0.65rem; color:#888;">TON</span>`;
        }
        
        const cardClass = isClaimed ? 'completed' : (isComplete ? 'claimable' : '');
        
        html += `
        <div class="task-card ${cardClass}">
            <div class="task-icon" style="background:${task.color}20; color:${task.color};">${task.icon}</div>
            <div class="task-info">
                <div class="task-name">${task.getName()}</div>
                <div class="task-desc">${task.getDesc()}</div>
                <div class="task-progress-bar">
                    <div class="task-progress-fill" style="width:${pct}%; background:${isClaimed ? 'var(--success)' : task.color};"></div>
                </div>
                <div style="font-size:0.7rem; color:#666; margin-top:3px;">${progress >= task.goal ? task.goal : Math.floor(progress)}/${task.goal}</div>
            </div>
            <div class="task-reward">${statusHtml}</div>
        </div>`;
    });
    
    list.innerHTML = html;
    
    const countEl = document.getElementById('tasksCompletedCount');
    const rewardEl = document.getElementById('tasksTotalReward');
    if (countEl) countEl.textContent = completedCount;
    if (rewardEl) rewardEl.textContent = totalReward.toFixed(2);
}

window.claimTask = function(taskId) {
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;
    
    const progress = task.getProgress();
    if (progress < task.goal) return;
    
    const claimed = getClaimedTasks();
    if (claimed.includes(taskId)) return;
    
    claimed.push(taskId);
    saveClaimedTasks(claimed);
    
    state.balance += task.reward;
    state.totalEarned += task.reward;
    saveLocalData();
    syncToServer();
    updateUI();
    
    showToast(`🏆 +${task.reward} TON! ${task.getName()}`, false);
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    
    renderTasks();
};

// Check for claimable tasks and show badge
function getClaimableTaskCount() {
    const claimed = getClaimedTasks();
    let count = 0;
    TASKS.forEach(task => {
        if (!claimed.includes(task.id) && task.getProgress() >= task.goal) count++;
    });
    return count;
}

// --- ONBOARDING ---
function checkOnboarding() {
    const seen = localStorage.getItem('tonminer_onboard');
    if (seen) return;
    
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

window.nextOnboard = function(step) {
    document.querySelectorAll('.onboard-step').forEach(s => s.style.display = 'none');
    const el = document.getElementById('onboardStep' + step);
    if (el) el.style.display = 'block';
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } catch(e) {}
};

window.finishOnboard = function() {
    localStorage.setItem('tonminer_onboard', '1');
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        setTimeout(() => { 
            overlay.style.display = 'none'; 
            overlay.style.opacity = '1'; 
            // After onboarding, check daily bonus
            checkDailyBonus();
        }, 400);
    }
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); } catch(e) {}
};

// --- PUSH NOTIFICATION HELPER ---
async function sendPushNotification(chatId, message) {
    try {
        await fetch('/api/push-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message })
        });
    } catch(e) { console.warn('Push notify failed:', e); }
}

// Schedule notification check (runs every time app opens)
function checkNotificationEligibility() {
    const chatId = tg?.initDataUnsafe?.user?.id;
    if (!chatId) return;
    
    // Save chatId for push notifications
    if (state.wallet) {
        const dataToSave = { telegramChatId: chatId };
        try { saveUserToFire(state.wallet, dataToSave); } catch(e) {}
    }
}

// --- LANGUAGE ---
function applyLanguage() {
    // Header
    const balLbl = document.querySelector('.bal-lbl');
    if (balLbl) balLbl.textContent = t('totalBalance');

    // Dashboard static texts
    const dCount = document.querySelector('[data-lang="activeDevices"]');
    const dDaily = document.querySelector('[data-lang="dailyTon"]');
    if (dCount) dCount.textContent = t('activeDevices');
    if (dDaily) dDaily.textContent = t('dailyTon');

    // Network status
    const netLabel = document.querySelector('.lg-header > span:first-child');
    if (netLabel) netLabel.textContent = t('networkStatus');

    // Free card
    const fcTitle = document.querySelector('.fc-info h4');
    const fcDesc = document.querySelector('.fc-info p');
    if (fcTitle) fcTitle.textContent = t('freeNode');
    if (fcDesc) fcDesc.textContent = t('freeNodeDesc');
    const adBtn = document.querySelector('.ad-btn');
    if (adBtn && !adBtn.disabled) adBtn.textContent = t('watch');

    // Channel card
    const chTitle = document.querySelector('[data-lang="joinChannel"]');
    const chDesc = document.querySelector('[data-lang="channelDesc"]');
    if (chTitle) chTitle.textContent = t('joinChannel');
    if (chDesc) chDesc.textContent = t('channelDesc');

    // Spin card
    const spTitle = document.querySelector('[data-lang="dailySpin"]');
    if (spTitle) spTitle.textContent = t('dailySpin');

    // Market title
    const marketTitle = document.getElementById('marketTitle');
    if (marketTitle) marketTitle.textContent = t('hardwareStore');

    // Inventory title
    const invTitle = document.getElementById('invTitle');
    if (invTitle) invTitle.textContent = t('myDevices');

    // Wallet
    const wTitle = document.getElementById('walletTitle');
    if (wTitle) wTitle.textContent = t('withdraw');
    const wPlaceholder = document.getElementById('w-amt');
    if (wPlaceholder) wPlaceholder.placeholder = t('enterAmount');
    const wMin = document.getElementById('wMinLabel');
    if (wMin) wMin.textContent = t('minWithdraw');
    const wBtn = document.getElementById('wBtn');
    if (wBtn) wBtn.innerHTML = `<i class="fas fa-paper-plane"></i> ${t('withdrawBtn')}`;

    // Referral
    const refTitle = document.getElementById('refTitle');
    if (refTitle) refTitle.textContent = t('referralTitle');

    // Spin modal
    const smTitle = document.querySelector('.spin-modal-header h3');
    if (smTitle) smTitle.innerHTML = `<i class="fas fa-dharmachakra"></i> ${t('dailyFortune')}`;

    // Language toggle state
    const langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.textContent = '🌐 ' + currentLang.toUpperCase();

    // Tasks
    const tasksTitle = document.getElementById('tasksTitle');
    const tasksSubtitle = document.getElementById('tasksSubtitle');
    if (tasksTitle) tasksTitle.textContent = t('tasksTitle') || 'Tasks & Achievements';
    if (tasksSubtitle) tasksSubtitle.textContent = t('tasksSubtitle') || 'Complete tasks to earn bonus TON!';

    // Re-render dynamic content
    renderMarket();
    renderInv();
    updateRankBadge();
    renderTasks();
}

window.toggleLanguage = function() {
    // Remove existing picker
    const old = document.getElementById('langPicker');
    if (old) { old.remove(); return; }
    
    const langs = getAvailableLanguages();
    let html = '';
    langs.forEach(l => {
        const active = l.code === currentLang ? 'background:rgba(64,224,208,0.15);border-color:var(--primary);' : '';
        const check = l.code === currentLang ? ' ✓' : '';
        html += `<div onclick="selectLang('${l.code}')" style="padding:10px 14px;border-radius:10px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);${active}font-size:0.8rem;color:#fff;text-align:center;">${l.name}${check}</div>`;
    });
    
    const picker = document.createElement('div');
    picker.id = 'langPicker';
    picker.innerHTML = `
        <div style="background:rgba(21,40,68,0.97);border:1.5px solid rgba(64,224,208,0.25);border-radius:20px;padding:20px;max-width:320px;width:100%;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <span style="color:var(--primary);font-weight:700;font-size:1rem;">🌐 Language</span>
                <button onclick="document.getElementById('langPicker').remove()" style="background:rgba(255,255,255,0.08);border:none;color:var(--text-muted);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:0.9rem;">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${html}</div>
        </div>
    `;
    picker.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:6000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);padding:20px;animation:fadeIn 0.2s ease;';
    picker.addEventListener('click', (e) => { if (e.target === picker) picker.remove(); });
    document.body.appendChild(picker);
}

window.selectLang = function(code) {
    setLanguage(code);
    window.location.reload();
}

init();
