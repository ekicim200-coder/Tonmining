/* NEXUS MINER - CORE LOGIC (app.js)
   OPTIMİZE EDİLMİŞ VERSİYON:
   - Görsel güncelleme: 1 saniye (Akıcılık için)
   - Veri Kaydetme: 2 dakika (Sunucu/Disk performansı için)
*/

// --- 1. OYUN VERİSİ VE AYARLAR ---
let gameData = {
    balance: 0.0000000,
    hashrate: 0, // TH/s
    clickMultiplier: 1,
    lastLogin: Date.now(),
    inventory: [
        { id: 'starter_rig', name: 'Genesis Rig', power: 5, count: 1 }
    ],
    transactions: []
};

// ZORLUK SEVİYESİ
const MINING_DIFFICULTY = 0.0000001; 

// --- 2. BAŞLANGIÇ (INIT) FONKSİYONU ---
document.addEventListener('DOMContentLoaded', () => {
    loadGame();     
    setupUI();      
    startMining();  
    checkOfflineEarnings(); 

    // ÖNEMLİ DEĞİŞİKLİK BURADA:
    // Kayıt işlemini (Save) 2 dakikada bir (120.000 ms) yapıyoruz.
    // Bu sayede sunucu/disk yorulmuyor.
    setInterval(saveGame, 120000); 
});

// --- 3. KAYDETME VE YÜKLEME SİSTEMİ ---

function saveGame() {
    gameData.lastLogin = Date.now();
    localStorage.setItem('nexus_miner_save', JSON.stringify(gameData));
    
    // Kullanıcıya "Kaydedildi" mesajı verelim
    const indicator = document.getElementById('save-indicator');
    if(indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    }
    console.log("Sistem: Veriler 2 dakikalık periyotla kaydedildi.");
}

function loadGame() {
    const saved = localStorage.getItem('nexus_miner_save');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameData = { ...gameData, ...parsed }; 
    }
    updateDisplays();
}

// --- 4. MADENCİLİK DÖNGÜSÜ (Görsel Kısım) ---

function startMining() {
    calculateTotalHashrate();
    
    // Burası hala 1 saniyede çalışır AMA sadece RAM'de işlem yapar.
    // Sunucuya gitmez, internet harcamaz. Sadece görseli günceller.
    setInterval(() => {
        const incomePerSecond = gameData.hashrate * MINING_DIFFICULTY;
        gameData.balance += incomePerSecond;
        updateDisplays();
    }, 1000);
    
    initChart();
}

function calculateTotalHashrate() {
    let total = 0;
    gameData.inventory.forEach(item => {
        total += item.power * item.count;
    });
    gameData.hashrate = total;
}

function checkOfflineEarnings() {
    const now = Date.now();
    const diffSeconds = (now - gameData.lastLogin) / 1000;
    
    // 2 dakikadan (120 sn) fazla kapalı kaldıysa kazanç ver
    if (diffSeconds > 120 && gameData.hashrate > 0) {
        const offlineIncome = diffSeconds * (gameData.hashrate * MINING_DIFFICULTY);
        gameData.balance += offlineIncome;
        
        document.getElementById('offline-amount').innerText = offlineIncome.toFixed(5);
        document.getElementById('offline-modal').style.display = 'flex';
    } else {
        document.getElementById('offline-modal').style.display = 'none';
    }
}

// --- 5. ARAYÜZ GÜNCELLEMELERİ ---

function updateDisplays() {
    const formattedBalance = gameData.balance.toFixed(7);
    const dailyEst = (gameData.hashrate * MINING_DIFFICULTY * 86400).toFixed(2);
    const incomePerSec = (gameData.hashrate * MINING_DIFFICULTY).toFixed(7);

    if(document.getElementById('main-balance')) document.getElementById('main-balance').innerText = formattedBalance;
    if(document.getElementById('mobile-balance')) document.getElementById('mobile-balance').innerText = formattedBalance;
    if(document.getElementById('wallet-balance-display')) document.getElementById('wallet-balance-display').innerText = formattedBalance;
    
    if(document.getElementById('dash-hash')) document.getElementById('dash-hash').innerText = gameData.hashrate;
    if(document.getElementById('dash-daily')) document.getElementById('dash-daily').innerText = dailyEst;
    if(document.getElementById('dash-income')) document.getElementById('dash-income').innerText = incomePerSec;
    
    const totalDevices = gameData.inventory.reduce((acc, item) => acc + item.count, 0);
    if(document.getElementById('dash-devices')) document.getElementById('dash-devices').innerText = totalDevices;

    renderInventory();
}

// --- 6. SAYFA YÖNETİMİ VE MARKET ---

window.gameApp = {
    showPage: function(pageId) {
        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        
        document.getElementById('page-' + pageId).classList.add('active');
        
        const navBtn = document.getElementById('nav-' + pageId);
        if(navBtn) navBtn.classList.add('active');
    },

    closeModal: function() {
        document.getElementById('offline-modal').style.display = 'none';
        saveGame(); 
    },

    processWithdraw: function() {
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        const address = document.getElementById('wallet-address').value;

        if (!address || address.length < 5) {
            showToast('Invalid Wallet Address!', 'error');
            return;
        }
        if (amount > gameData.balance) {
            showToast('Insufficient Balance!', 'error');
            return;
        }
        if (amount < 50) {
            showToast('Minimum withdrawal is 50 TON', 'error');
            return;
        }

        gameData.balance -= amount;
        gameData.transactions.unshift({
            date: new Date().toLocaleString(),
            amount: amount,
            status: 'Processing'
        });
        
        saveGame(); // Para çekince hemen kaydetmek güvenlik için şarttır
        showToast('Withdrawal Request Sent!', 'success');
        updateDisplays();
        renderHistory();
        document.getElementById('withdraw-amount').value = '';
    },
    
    buyItem: function(id, cost, power, name) {
        if(gameData.balance >= cost) {
            gameData.balance -= cost;
            
            const existing = gameData.inventory.find(i => i.id === id);
            if(existing) {
                existing.count++;
            } else {
                gameData.inventory.push({ id, name, power, count: 1 });
            }
            
            calculateTotalHashrate();
            saveGame(); // Satın alma işlemi kritiktir, hemen kaydedilmeli
            updateDisplays();
            showToast(`${name} Purchased!`, 'success');
        } else {
            showToast('Not enough TON balance!', 'error');
        }
    }
};

// --- YARDIMCI FONKSİYONLAR ---

function setupUI() {
    renderMarket();
    renderInventory();
    renderHistory();
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 mb-2 rounded-xl text-white font-bold text-sm shadow-lg transform transition-all duration-500 translate-x-full ${type === 'error' ? 'bg-red-600' : 'bg-green-600'}`;
    toast.innerText = msg;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function renderMarket() {
    const marketItems = [
        { id: 'gpu_1', name: 'GTX 1060', power: 15, cost: 5, icon: 'fa-microchip' },
        { id: 'gpu_2', name: 'RTX 3060', power: 45, cost: 15, icon: 'fa-memory' },
        { id: 'asic_1', name: 'Antminer S9', power: 120, cost: 50, icon: 'fa-server' },
        { id: 'asic_pro', name: 'Nexus Pro', power: 500, cost: 200, icon: 'fa-layer-group' }
    ];

    const container = document.getElementById('market-list');
    if(!container) return;
    
    container.innerHTML = marketItems.map(item => `
        <div class="glass-panel p-4 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition group">
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center text-cyan-400 text-xl group-hover:scale-110 transition">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <div class="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded">+${item.power} TH/s</div>
            </div>
            <h3 class="text-white font-bold mb-1">${item.name}</h3>
            <div class="text-cyan-400 text-lg font-bold mb-4">${item.cost} TON</div>
            <button onclick="window.gameApp.buyItem('${item.id}', ${item.cost}, ${item.power}, '${item.name}')" class="w-full btn-main py-2 rounded-lg text-sm font-bold uppercase hover:bg-cyan-600 transition">
                Buy Unit
            </button>
        </div>
    `).join('');
}

function renderInventory() {
    const container = document.getElementById('inventory-list');
    if(!container) return;

    if(gameData.inventory.length === 0) {
        container.innerHTML = '<div class="text-gray-500 col-span-2 text-center">No active rigs.</div>';
        return;
    }

    container.innerHTML = gameData.inventory.map(item => `
        <div class="glass-panel p-4 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                    <i class="fa-solid fa-bolt"></i>
                </div>
                <div>
                    <div class="text-white font-bold">${item.name}</div>
                    <div class="text-xs text-gray-400">Power: ${item.power} TH/s</div>
                </div>
            </div>
            <div class="text-xl font-bold text-white">x${item.count}</div>
        </div>
    `).join('');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if(!container) return;
    
    if(gameData.transactions.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-10 italic">No transaction history found.</div>';
        return;
    }
    
    container.innerHTML = gameData.transactions.map(tx => `
        <div class="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
            <div>
                <div class="text-white font-bold text-sm">Withdrawal</div>
                <div class="text-xs text-gray-500">${tx.date}</div>
            </div>
            <div class="text-right">
                <div class="text-red-400 font-bold text-sm">-${tx.amount} TON</div>
                <div class="text-[10px] text-yellow-500 uppercase tracking-wider">${tx.status}</div>
            </div>
        </div>
    `).join('');
}

function initChart() {
    const ctx = document.getElementById('miningChart');
    if (!ctx) return;
    
    if (window.myMiningChart) window.myMiningChart.destroy();

    window.myMiningChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                label: 'Network Difficulty',
                data: [65, 59, 80, 81, 56, 95],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                y: { grid: { color: '#374151' }, ticks: { color: '#6b7280' } }
            }
        }
    });
}
