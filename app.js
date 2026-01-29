// app.js

// KİMLİK SABİTLEME (Veriler asla silinmez)
const USER_ID = "PATRON_KULLANICI_FINAL"; 

let gameState = {
    balance: 0,
    items: 0
};

// Sayfa yüklendiğinde çalışır
document.addEventListener('DOMContentLoaded', () => {
    // Veritabanı hazır mı kontrol et
    if (!window.db) {
        alert("Veritabanı bulunamadı! Lütfen internet bağlantını kontrol et.");
        return;
    }
    
    // Oyunu Başlat
    loadGame();
});

// --- 1. VERİ YÜKLEME (READ) ---
function loadGame() {
    updateStatus("Sunucudan veri çekiliyor...", "yellow");

    window.db.collection("users").doc(USER_ID).get()
    .then((doc) => {
        if (doc.exists) {
            // Kayıt varsa yükle
            gameState = doc.data();
            console.log("Mevcut veri yüklendi:", gameState);
            updateStatus("✅ Çevrimiçi (Veriler Geldi)", "green");
        } else {
            // Kayıt yoksa oluştur
            console.log("Yeni kayıt oluşturuluyor...");
            gameState.balance = 100; // Başlangıç hediyesi
            saveGame();
        }
        updateUI();
    })
    .catch((error) => {
        console.error("Yükleme Hatası:", error);
        updateStatus("❌ Bağlantı Hatası", "red");
    });
}

// --- 2. VERİ KAYDETME (WRITE) ---
function saveGame() {
    updateStatus("Kaydediliyor...", "yellow");

    window.db.collection("users").doc(USER_ID).set(gameState, { merge: true })
    .then(() => {
        console.log("Veri sunucuya işlendi.");
        updateStatus("✅ Kaydedildi", "green");
        
        // 2 saniye sonra normale dön
        setTimeout(() => updateStatus("✅ Çevrimiçi", "green"), 2000);
    })
    .catch((error) => {
        console.error("Kayıt Hatası:", error);
        updateStatus("❌ KAYIT BAŞARISIZ!", "red");
        
        if(error.message.includes("permission-denied")) {
            alert("HATA: Firebase 'Kurallar' (Rules) kapalı. Lütfen konsoldan açın.");
        }
    });
}

// --- İŞLEMLER ---

// Para Ekleme Fonksiyonu
window.addMoney = function() {
    gameState.balance += 50;
    updateUI();
    saveGame(); // Değişikliği anında kaydet
};

// Ürün Alma Fonksiyonu
window.buyItem = function() {
    if(gameState.balance >= 10) {
        gameState.balance -= 10;
        gameState.items += 1;
        updateUI();
        saveGame(); // Değişikliği anında kaydet
    } else {
        alert("Yetersiz Bakiye!");
    }
};

// Arayüz Güncelleme
function updateUI() {
    document.getElementById('balance-display').innerText = gameState.balance.toFixed(2);
    document.getElementById('item-display').innerText = gameState.items;
}

// Durum Bildirimi
function updateStatus(msg, color) {
    const el = document.getElementById('status-text');
    if(el) {
        el.innerText = msg;
        el.style.color = color === "green" ? "#00ff00" : (color === "yellow" ? "#ffff00" : "red");
    }
}
