// --- DEĞİŞKENLER ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

const products = [
    { id: 1, name: "Nano Node", priceTON: 10, hash: 100, icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig", priceTON: 30, hash: 300, icon: "fa-memory", color: "text-green-400" },
    { id: 3, name: "GTX Cluster", priceTON: 60, hash: 600, icon: "fa-server", color: "text-cyan-400" },
    { id: 4, name: "RTX Farm", priceTON: 90, hash: 900, icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior", priceTON: 120, hash: 1200, icon: "fa-industry", color: "text-purple-500" },
    { id: 6, name: "ASIC Pro", priceTON: 150, hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, hash: 1800, icon: "fa-city", color: "text-yellow-400" },
    { id: 8, name: "Quantum Core", priceTON: 200, hash: 2000, icon: "fa-atom", color: "text-red-500" }
];

products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

let gameState = {
    balance: 0.00,
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    history: [],
    lastLogin: Date.now()
};

// --- KULLANICI KİMLİĞİ ---
let userID = localStorage.getItem('nexus_uid') || "user_" + Math.floor(Math.random() * 999999);
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    userID = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
}
localStorage.setItem('nexus_uid', userID);

// --- FIREBASE İŞLEMLERİ ---

async function saveGame() {
    const ind = document.getElementById('save-indicator');
    if (!window.db || !firebase.auth().currentUser) {
        console.log("Kayıt bekletiliyor: Auth henüz hazır değil.");
        return;
    }

    if (ind) {
        ind.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
        ind.style.opacity = '1';
    }

    try {
        await window.db.collection("users").doc(userID).set({
            ...gameState,
            lastLogin: Date.now()
        }, { merge: true });
        
        if (ind) {
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Kaydedildi!';
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
    } catch (e) {
        console.error("Kayıt Hatası:", e);
        if (ind) ind.innerHTML = '<i class="fa-solid fa-xmark"></i> Hata!';
        // Eğer izin hatası varsa ekrana uyarı ver
        if (e.code === 'permission-denied') {
            alert("Firebase İzin Hatası! Kuralları (Rules) kontrol et.");
        }
    }
}

async function loadGame() {
    try {
        const doc = await window.db.collection("users").doc(userID).get();
        if (doc.exists) {
            gameState = { ...gameState, ...doc.data() };
            console.log("✅ Veriler Buluttan Geldi.");
        } else {
            console.log("🆕 Yeni kullanıcı oluşturuluyor...");
            await saveGame();
        }
    } catch (e) {
        console.error("Yükleme Hatası:", e);
    }
    finalizeLoad();
}

// --- BAŞLATMA ---

document.addEventListener('DOMContentLoaded', () => {
    window.Telegram?.WebApp?.expand();

    // ÖNCE GİRİŞ YAP, SONRA YÜKLE
    firebase.auth().signInAnonymously()
        .then(() => {
            console.log("🔑 Giriş başarılı, veriler çekiliyor...");
            loadGame();
        })
        .catch(err => {
            console.error("Auth Hatası:", err);
            alert("Giriş yapılamadı! Firebase panelinde Authentication > Anonymous açık mı?");
        });

    setInterval(saveGame, 60000); // 1 dakikada bir otomatik kayıt
});

function finalizeLoad() {
    recalcStats();
    if (gameState.hashrate > 0) activateSystem();
    renderMarket();
    updateUI();
    // Chart vb. görselleri başlat
}

// UI ve diğer yardımcı fonksiyonları (recalcStats, activateSystem vb.) olduğu gibi bırakabilirsin.
