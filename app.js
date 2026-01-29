// app.js
const products = [
    { id: 1, name: "Nano Node", price: 10, income: 0.0000077 },
    { id: 2, name: "Micro Rig", price: 30, income: 0.0000231 }
];

let gameState = { balance: 10, inventory: {}, lastLogin: Date.now() };
let currentUser = null;

// Sayfa yüklendiğinde çalışacaklar
document.addEventListener('DOMContentLoaded', () => {
    renderMarketUI();
    initFirebaseLogic();
});

function initFirebaseLogic() {
    window.auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("🔐 Giriş Yapıldı:", user.uid);
            loadUserData();
        } else {
            console.log("👤 Anonim Giriş Yapılıyor...");
            window.auth.signInAnonymously();
        }
    });
}

function loadUserData() {
    window.db.collection("users").doc(currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            gameState = doc.data();
            updateUI();
            document.getElementById('status-badge').innerText = "ONLINE";
            document.getElementById('status-badge').className = "text-green-500 font-bold";
        } else {
            console.log("🆕 Yeni kullanıcı kaydı oluşturuluyor...");
            saveUserData();
        }
    }, (error) => {
        console.error("❌ Firestore Hatası (Muhtemelen Rules hatası):", error);
        document.getElementById('status-badge').innerText = "PERMISSION DENIED";
    });
}

function saveUserData() {
    if (!currentUser) return;
    window.db.collection("users").doc(currentUser.uid).set(gameState, { merge: true });
}

function renderMarketUI() {
    const list = document.getElementById('market-list');
    if (!list) return;
    list.innerHTML = "";
    products.forEach(p => {
        list.innerHTML += `
            <div class="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                <div>
                    <div class="font-bold">${p.name}</div>
                    <div class="text-xs text-green-400">+${(p.income * 86400).toFixed(2)} TON / Day</div>
                </div>
                <button onclick="buyMachine(${p.id})" class="bg-blue-600 px-4 py-2 rounded-lg font-bold text-sm">
                    ${p.price} TON
                </button>
            </div>
        `;
    });
}

function updateUI() {
    document.getElementById('main-balance').innerText = gameState.balance.toFixed(7);
}

// Global fonksiyon (Butonlar için)
window.buyMachine = (id) => {
    const p = products.find(x => x.id === id);
    if (gameState.balance >= p.price) {
        gameState.balance -= p.price;
        gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
        saveUserData();
        alert("Satın alma başarılı!");
    } else {
        alert("Bakiye yetersiz!");
    }
};

// Mining Döngüsü (Her saniye bakiye artır)
setInterval(() => {
    let totalIncome = 0;
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        totalIncome += p.income * count;
    });

    if (totalIncome > 0) {
        gameState.balance += totalIncome;
        updateUI();
    }
}, 1000);
