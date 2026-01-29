// app.js

// --- SABİT KİMLİK (BU SAYEDE SİLİNMİYOR) ---
const USER_ID = "SABIT_PATRON_KULLANICISI"; 

// Oyunun varsayılan durumu
let gameState = {
    balance: 0,
    items: 0,
    lastSave: null
};

// Sayfa açılınca çalışır
document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('status-text');
    statusEl.innerText = "Sunucuya Bağlanılıyor...";
    statusEl.style.color = "yellow";

    // 1 saniye bekle ki veritabanı tam yüklensin
    setTimeout(() => {
        if (window.db) {
            loadGame();
        } else {
            alert("HATA: Config dosyası yüklenemedi!");
        }
    }, 1000);
});

// --- VERİ YÜKLEME (READ) ---
function loadGame() {
    console.log("Veri çekiliyor...");
    
    window.db.collection("users").doc(USER_ID).get()
    .then((doc) => {
        if (doc.exists) {
            // Kayıt varsa onu kullan
            gameState = doc.data();
            console.log("✅ Veriler Sunucudan Geldi:", gameState);
            updateStatus("✅ SİSTEM AKTİF (Veri Yüklendi)", "green");
        } else {
            // Kayıt yoksa yeni oluştur (100 TON hediye)
            console.log("🆕 İlk defa giriliyor. Kayıt açılıyor...");
            gameState.balance = 100; 
            saveGame();
        }
        updateUI();
    })
    .catch((error) => {
        console.error("Yükleme Hatası:", error);
        updateStatus("❌ BAĞLANTI KOPTU", "red");
    });
}

// --- VERİ KAYDETME (WRITE) ---
function saveGame() {
    updateStatus("Kaydediliyor...", "yellow");
    gameState.lastSave = new Date().toISOString();

    window.db.collection("users").doc(USER_ID).set(gameState, { merge: true })
    .then(() => {
        console.log("💾 Veri Kaydedildi.");
        updateStatus("✅ KAYDEDİLDİ", "green");
        
        // 2 saniye sonra normale dön
        setTimeout(() => updateStatus("✅ SİSTEM AKTİF", "green"), 2000);
    })
    .catch((error) => {
        console.error("Kayıt Hatası:", error);
        alert("KAYIT BAŞARISIZ! Firebase Kuralları kapalı olabilir.");
    });
}

// --- OYUN FONKSİYONLARI ---

window.addMoney = function() {
    gameState.balance += 50; // 50 Ekle
    updateUI();
    saveGame(); // ANINDA KAYDET
};

window.buyItem = function() {
    if (gameState.balance >= 10) {
        gameState.balance -= 10;
        gameState.items += 1;
        updateUI();
        saveGame(); // ANINDA KAYDET
    } else {
        alert("Paran yetmiyor!");
    }
};

function updateUI() {
    document.getElementById('balance-display').innerText = gameState.balance.toFixed(2);
    document.getElementById('item-display').innerText = gameState.items;
}

function updateStatus(msg, color) {
    const el = document.getElementById('status-text');
    el.innerText = msg;
    el.style.color = (color === "green" ? "#00ff00" : (color === "yellow" ? "#ffff00" : "red"));
}
