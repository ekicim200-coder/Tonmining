// --- OYUN AYARLARI ---
const products = [
    { id: 1, name: "Nano CPU", price: 10, hash: 100, income: 0.0007 },
    { id: 2, name: "GTX 1060", price: 50, hash: 500, income: 0.0038 },
    { id: 3, name: "RTX 3090", price: 150, hash: 1500, income: 0.0115 },
    { id: 4, name: "ASIC Miner", price: 500, hash: 5000, income: 0.0385 }
];

let gameState = {
    balance: 0.00,
    inventory: {}, // Hangi makineden kaç tane var
    lastLogin: Date.now(),
    totalHash: 0,
    dailyIncome: 0
};

// --- KULLANICI KİMLİĞİ (SABİT) ---
let userID = localStorage.getItem('nexus_id');
if (!userID) {
    userID = "user_" + Math.floor(Math.random() * 9999999);
    localStorage.setItem('nexus_id', userID);
}
// Eğer Telegram içindeysek ID'yi oradan al
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    userID = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
}

console.log("👤 Aktif Kullanıcı ID:", userID);


// --- KRİTİK BÖLÜM: KAYIT SİSTEMİ ---

async function saveGame() {
    const ind = document.getElementById('save-indicator');
    
    // Eğer giriş yapılmadıysa kaydetmeye çalışma (Hata verir)
    if (!window.auth.currentUser) return;

    if(ind) { ind.style.opacity = '1'; ind.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }

    try {
        // Veriyi güvenli hale getir ve gönder
        await window.db.collection("users").doc(userID).set({
            balance: gameState.balance,
            inventory: gameState.inventory,
            lastLogin: Date.now()
        }, { merge: true });

        if(ind) {
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
    } catch (error) {
        console.error("Kayıt Hatası:", error);
        if(ind) ind.innerHTML = '❌ Hata! (Rules Kontrol Et)';
        if(error.code === 'permission-denied') alert("HATA: Firebase Kuralları (Rules) kapalı!");
    }
}

async function loadGame() {
    console.log("☁️ Veri çekiliyor...");
    try {
        const doc = await window.db.collection("users").doc(userID).get();
        if (doc.exists) {
            const data = doc.data();
            gameState.balance = data.balance || 0;
            gameState.inventory = data.inventory || {};
            console.log("✅ Veri Yüklendi:", data);
        } else {
            console.log("🆕 Yeni kullanıcı, kayıt açılıyor...");
            await saveGame();
        }
    } catch (error) {
        console.error("Yükleme Hatası:", error);
    }
    // Veri gelse de gelmese de oyunu başlat
    startGameLoop();
}


// --- OYUN MANTIĞI ---

function startGameLoop() {
    recalcStats();
    renderMarket();
    updateUI();
    
    // "Online" yap
    document.getElementById('status-indicator').classList.replace('bg-gray-500', 'bg-green-500');
    document.getElementById('status-text').innerText = "SYSTEM ONLINE";
    document.getElementById('status-text').classList.add('text-green-400');

    // Her saniye bakiyeyi artır
    setInterval(() => {
        if(gameState.dailyIncome > 0) {
            // Günlük geliri saniyeye bölüp ekle
            gameState.balance += (gameState.dailyIncome / 86400); 
            updateUI();
        }
    }, 1000);

    // Her 30 saniyede bir otomatik kaydet
    setInterval(saveGame, 30000);
}

function recalcStats() {
    let hash = 0;
    let income = 0;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        hash += p.hash * count;
        income += p.income * count;
    });
    gameState.totalHash = hash;
    gameState.dailyIncome = income;
}

function updateUI() {
    document.getElementById('main-balance').innerText = gameState.balance.toFixed(7);
    document.getElementById('dash-hash').innerText = gameState.totalHash;
    document.getElementById('dash-daily').innerText = gameState.dailyIncome.toFixed(4);
}

// --- MARKET SİSTEMİ ---

function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = '';
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        const div = document.createElement('div');
        div.className = "glass-panel p-4 rounded-xl border border-gray-800 flex justify-between items-center";
        div.innerHTML = `
            <div>
                <div class="font-bold text-white">${p.name}</div>
                <div class="text-xs text-gray-500">+${p.income} TON/Day</div>
                <div class="text-xs text-cyan-500 mt-1">Owned: ${count}</div>
            </div>
            <button onclick="buyItem(${p.id})" class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition border border-white/10">
                ${p.price} TON
            </button>
        `;
        list.appendChild(div);
    });
}

// app.js dışından erişilebilmesi için window'a ekle
window.buyItem = function(id) {
    const p = products.find(x => x.id === id);
    if(gameState.balance >= p.price) {
        gameState.balance -= p.price;
        gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
        recalcStats();
        updateUI();
        renderMarket();
        saveGame(); // Satın alır almaz kaydet!
    } else {
        alert("Bakiye Yetersiz!");
    }
};


// --- 🔥 BAŞLATMA NOKTASI (EN ÖNEMLİSİ) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Telegramı Genişlet
    window.Telegram?.WebApp?.expand();

    console.log("🔑 Giriş yapılıyor...");
    
    // 2. ÖNCE GİRİŞ YAP -> SONRA OYUNU YÜKLE
    window.auth.signInAnonymously()
        .then(() => {
            console.log("✅ Giriş Başarılı! Veri çekiliyor...");
            loadGame();
        })
        .catch((error) => {
            console.error("Giriş Hatası:", error);
            alert("Firebase'e bağlanılamadı! İnternetini kontrol et.");
        });
});
