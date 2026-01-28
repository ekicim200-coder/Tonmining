/* NEXUS MINER - FINAL STABLE VERSION (app.js)
   Bu sürümde "Agresif Kayıt" aktiftir. Veri kaybını önlemek için
   hem zamanlayıcı hem de çoklu olay dinleyicisi kullanılır.
*/

// --- 1. OYUN VERİSİ VE AYARLAR ---
let gameData = {
    balance: 0.0000000,
    hashrate: 0,
    lastLogin: Date.now(),
    inventory: [
        { id: 'starter_rig', name: 'Genesis Rig', power: 5, count: 1 }
    ],
    transactions: []
};

const MINING_DIFFICULTY = 0.0000001; 

// --- 2. BAŞLANGIÇ (INIT) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistem başlatılıyor...");
    
    // 1. Önce veriyi yükle
    loadGame();     
    
    // 2. Arayüzü kur
    setupUI();      
    
    // 3. Madenciliği başlat
    startMining();  
    
    // 4. Çevrimdışı kazanç kontrolü
    checkOfflineEarnings(); 

    // *** GARANTİ KAYIT SİSTEMİ ***
    // Her 3 saniyede bir otomatik kaydet. 
    // Sunucu olmadığı için bu tarayıcıyı yormaz, en güvenli yöntemdir.
    setInterval(() => {
        saveGame();
    }, 3000);
});

// --- 3. GÜÇLENDİRİLMİŞ KAYIT SİSTEMİ ---

// Farklı tarayıcılar için tüm çıkış senaryolarını yakala
document.addEventListener('visibilitychange', saveGame); // Sekme değiştirince
window.addEventListener('pagehide', saveGame); // Mobilde tarayıcıyı alta atınca
window.addEventListener('blur', saveGame); // Pencere odağını kaybedince
window.addEventListener('beforeunload', saveGame); // Sayfa kapatılınca

function saveGame() {
    try {
        gameData.lastLogin = Date.now();
        const jsonString = JSON.stringify(gameData);
        localStorage.setItem('nexus_miner_save', jsonString);
        
        // Debug için konsola yaz (F12'de görebilirsin)
        // console.log("Oyun Kaydedildi:", gameData.balance);
        
        // Görsel bildirim (Çok sık çıkmaması için sadece manuel işlemlerde gösterilebilir ama şimdilik kalsın)
        const indicator = document.getElementById('save-indicator');
        if(indicator && indicator.style.opacity === '0') {
            indicator.style.opacity = '0.5'; // Hafif silik göster
            setTimeout(() => { indicator.style.opacity = '0'; }, 1000);
        }
    } catch (error) {
        console.error("Kayıt Hatası:", error);
        // Eğer disk doluysa veya izinsizse kullanıcıyı uyar
        showToast("Save Error: Storage Full or Blocked", "error");
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem('nexus_miner_save');
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // Veri bütünlüğünü koru (Eksik alan varsa tamamla)
            gameData = {
                ...gameData,
                ...parsed,
                inventory: parsed.inventory || gameData.inventory // Envanter boşsa varsayılanı koruma
            };
            
            console.log("Veri başarıyla yüklendi. Bakiye:", gameData.balance);
        } else {
            console.log("Kayıtlı veri bulunamadı, yeni oyun başlatılıyor.");
        }
    } catch (error) {
        console.error("Yükleme Hatası:", error);
        localStorage.removeItem('nexus_miner_save'); // Bozuksa sil
    }
    updateDisplays();
}

// --- 4. MADENCİLİK MOTORU ---

function startMining() {
    calculateTotalHashrate();
    
    // Görsel sayaç (1 saniyede bir)
    setInterval(() => {
        if(gameData.hashrate > 0) {
            const incomePerSecond = gameData.hashrate * MINING_DIFFICULTY;
            gameData.balance += incomePerSecond;
            
            // Ekrana yansıt
            updateDisplays();
        }
    }, 1000);
    
    initChart();
}

function calculateTotalHashrate() {
    let total = 0;
    if (gameData.inventory) {
        gameData.inventory.forEach(item => {
            total += item.power * item.count;
        });
    }
    gameData.hashrate = total;
}

function checkOfflineEarnings() {
    const now = Date.now();
    const lastTime = gameData.lastLogin || now;
    const diffSeconds = (now - lastTime) / 1000;
    
    // 60 saniyeden uzun süre kapalı kaldıysa
    if (diffSeconds > 60 && gameData.hashrate > 0) {
        const offlineIncome = diffSeconds * (gameData.hashrate * MINING_DIFFICULTY);
        gameData.balance += offlineIncome;
        
        const modal = document.getElementById('offline-modal');
        const amountEl = document.getElementById('offline-amount');
        
        if(modal && amountEl) {
            amountEl.innerText = offlineIncome.toFixed(5);
            modal.style.display = 'flex';
        }
        saveGame(); // Kazancı ekler eklemez kaydet
    }
}

// --- 5. ARAYÜZ YÖNETİMİ ---

function updateDisplays() {
    // Sayılar NaN (Not a Number) olursa 0 yap
    if (isNaN(gameData.balance)) gameData.balance = 0;
    
    const formattedBalance = gameData.balance.toFixed(7);
    const dailyEst = (gameData.hashrate * MINING_DIFFICULTY * 86400).toFixed(2);
    const incomePerSec = (gameData.hashrate * MINING_DIFFICULTY).toFixed(7);

    // Helper: Element varsa güncelle
    const setTxt = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.innerText = val; 
    };

    setTxt('main-balance', formattedBalance);
    setTxt('mobile-balance', formattedBalance);
    setTxt('wallet-balance-display', formattedBalance);
    
    setTxt('dash-hash', gameData.hashrate);
    setTxt('dash-daily', dailyEst);
    setTxt('dash-income', incomePerSec);
    
    const totalDevices = (gameData.inventory || []).reduce((acc, item) => acc + item.count, 0);
    setTxt('dash-devices', totalDevices);

    renderInventory();
}

// --- 6. ETKİLEŞİM VE MARKET ---

window.gameApp = {
    showPage: function(pageId) {
        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        
        const p = document.getElementById('page-' + pageId);
        const n = document.getElementById('nav-' + pageId);
        
        if(p) p.classList.add('active');
        if(n) n.classList.add('active');
    },

    closeModal: function() {
        const modal = document.getElementById('offline-modal');
        if(modal) modal.style.display = 'none';
        saveGame();
    },

    processWithdraw: function() {
        const amountEl = document.getElementById('withdraw-amount');
        const addressEl = document.getElementById('wallet-address');
        
        const amount = parseFloat(amountEl.value);
        const address = addressEl.value;

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
        
        saveGame();
        showToast('Withdrawal Request Sent!', 'success');
        updateDisplays();
        renderHistory();
        amountEl.value = '';
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
            saveGame(); // Satın alımda ANINDA KAYIT
            updateDisplays();
            showToast(`${name} Purchased!`, 'success');
        } else {
            showToast('Not enough TON balance!', 'error');
        }
    },
    
    // Debug amaçlı: Verileri manuel sıfırlama komutu
    resetData: function() {
        if(confirm("Are you sure? All progress will be lost.")) {
            localStorage.removeItem('nexus_miner_save');
            location.reload();
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
    if(!container) return;
    
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

    if(!gameData.inventory || gameData.inventory.length === 0) {
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
    
    if(!gameData.transactions || gameData.transactions.length === 0) {
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
