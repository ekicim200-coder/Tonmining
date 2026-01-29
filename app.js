// YENİ YÜKLEME FONKSİYONU (FIREBASE) - Bekleme mekanizması eklenmiş
async function loadGame() {
    console.log("Veri Buluttan Çekiliyor...");

    // Firebase hazır olana kadar bekle
    let attempts = 0;
    while (!window.firebaseDB && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.firebaseDB) {
        console.error("Firebase yüklenemedi! LocalStorage kullanılıyor.");
        const localData = localStorage.getItem('nexusMinerV14');
        if(localData) gameState = { ...gameState, ...JSON.parse(localData) };
        finalizeLoad();
        return;
    }

    try {
        const userRef = window.firebaseDoc(window.firebaseDB, "users", userID);
        const docSnap = await window.firebaseGetDoc(userRef);

        if (docSnap.exists()) {
            const parsed = docSnap.data();
            gameState = { ...gameState, ...parsed };
            console.log("✅ Veri başarıyla yüklendi:", parsed);
        } else {
            console.log("🆕 Yeni kullanıcı, varsayılan veri ile başlanıyor.");
            await saveGame(); // İlk defa oluştur
        }
    } catch (error) {
        console.error("❌ Veri çekme hatası:", error);
        const localData = localStorage.getItem('nexusMinerV14');
        if(localData) gameState = { ...gameState, ...JSON.parse(localData) };
    }

    finalizeLoad();
}
