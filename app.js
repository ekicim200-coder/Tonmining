// app.js
import { db, doc, setDoc, getDoc } from './firebase-config.js';

console.log("🚀 Oyun Başlatılıyor...");

// --- 1. SABİT KİMLİK (ASLA DEĞİŞMEZ) ---
const USER_ID = "PATRON_KULLANICI_01"; 

// --- 2. OYUN VERİSİ ---
let gameState = {
    balance: 0,
    items: 0
};

// --- 3. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    updateStatus("Sunucuya bağlanılıyor...", "yellow");
    loadGame(); // Verileri çek
});

// --- VERİ YÜKLEME ---
async function loadGame() {
    try {
        const docRef = doc(db, "users", USER_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            gameState = docSnap.data();
            console.log("✅ Veri Bulundu:", gameState);
            updateStatus("✅ Çevrimiçi (Veri Yüklendi)", "green");
        } else {
            console.log("🆕 Yeni Kayıt Oluşturuluyor...");
            gameState.balance = 100; // Başlangıç Hediyesi
            await saveGame(true); // İlk kaydı zorla yap
        }
        updateUI();
    } catch (error) {
        console.error("YÜKLEME HATASI:", error);
        showError(error.message);
    }
}

// --- VERİ KAYDETME ---
async function saveGame(force = false) {
    updateStatus("Kaydediliyor...", "yellow");
    
    try {
        const docRef = doc(db, "users", USER_ID);
        await setDoc(docRef, gameState, { merge: true });
        
        console.log("💾 Kaydedildi.");
        updateStatus("✅ Kaydedildi", "green");
        
        // 2 saniye sonra normale dön
        setTimeout(() => updateStatus("✅ Çevrimiçi", "green"), 2000);
        
    } catch (error) {
        console.error("KAYIT HATASI:", error);
        showError("KAYDEDİLEMEDİ! " + error.message);
    }
}

// --- İŞLEMLER ---
window.buyItem = function() {
    if (gameState.balance >= 10) {
        gameState.balance -= 10;
        gameState.items += 1;
        updateUI();
        saveGame(); // Her işlemde kaydet
    } else {
        alert("Yetersiz Bakiye!");
    }
};

window.addMoney = function() {
    gameState.balance += 50;
    updateUI();
    saveGame();
};

// --- ARAYÜZ ---
function updateUI() {
    document.getElementById('balance-display').innerText = gameState.balance.toFixed(2);
    document.getElementById('item-display').innerText = gameState.items;
}

function updateStatus(msg, color) {
    const el = document.getElementById('status-box');
    el.innerText = msg;
    el.style.color = color === "green" ? "#00ff00" : (color === "yellow" ? "#ffff00" : "red");
}

function showError(msg) {
    updateStatus("❌ HATA: " + msg, "red");
    alert("HATA OLUŞTU:\n" + msg + "\n\nLütfen Firebase Kurallarını (Rules) kontrol et.");
}
