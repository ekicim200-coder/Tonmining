// app.js

const USER_ID = "PATRON_SABIT_KULLANICI"; // Asla değişmez
let gameState = {
    balance: 0,
    items: 0
};

// Sayfa tamamen açılınca çalışır
window.onload = function() {
    // Config dosyasından db geldi mi kontrol et
    if (!window.db) {
        document.getElementById('status').innerText = "❌ HATA: Veritabanı Bulunamadı!";
        document.getElementById('status').className = "text-red-500 font-bold border border-red-500 p-2 inline-block rounded";
        return;
    }

    loadGame();
};

// --- VERİ YÜKLEME ---
function loadGame() {
    updateStatus("Veri Çekiliyor...", "yellow");

    window.db.collection("users").doc(USER_ID).get()
    .then((doc) => {
        if (doc.exists) {
            gameState = doc.data(); // Veriyi al
            updateStatus("✅ Çevrimiçi (Veri Geldi)", "green");
        } else {
            // Veri yoksa oluştur
            gameState.balance = 100; 
            saveGame(); 
            updateStatus("🆕 Yeni Kayıt Açıldı", "green");
        }
        updateUI();
    })
    .catch((error) => {
        console.error(error);
        updateStatus("❌ BAĞLANTI HATASI", "red");
    });
}

// --- VERİ KAYDETME ---
function saveGame() {
    updateStatus("Kaydediliyor...", "yellow");

    window.db.collection("users").doc(USER_ID).set(gameState, { merge: true })
    .then(() => {
        updateStatus("✅ KAYDEDİLDİ", "green");
        setTimeout(() => updateStatus("✅ Çevrimiçi", "green"), 2000);
    })
    .catch((error) => {
        console.error(error);
        updateStatus("❌ KAYIT HATASI (İzin Yok)", "red");
        alert("Kayıt yapılamadı! Firebase Rules (Kurallar) kapalı olabilir.");
    });
}

// --- İŞLEMLER ---
window.addMoney = function() {
    gameState.balance += 50;
    updateUI();
    saveGame(); // Anında kaydet
};

window.buyItem = function() {
    if (gameState.balance >= 10) {
        gameState.balance -= 10;
        gameState.items += 1;
        updateUI();
        saveGame();
    } else {
        alert("Yetersiz Bakiye!");
    }
};

// --- GÖRÜNTÜ GÜNCELLEME ---
function updateUI() {
    document.getElementById('balance').innerText = gameState.balance.toFixed(2);
    document.getElementById('items').innerText = gameState.items;
}

function updateStatus(msg, color) {
    const el = document.getElementById('status');
    el.innerText = msg;
    
    if (color === "green") el.className = "text-green-500 font-bold border border-green-500 p-2 inline-block rounded";
    else if (color === "red") el.className = "text-red-500 font-bold border border-red-500 p-2 inline-block rounded";
    else el.className = "text-yellow-500 font-bold border border-yellow-500 p-2 inline-block rounded";
}
