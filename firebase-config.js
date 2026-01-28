// 1. Firebase'i elle çağırıyoruz
import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js").then(async (appLib) => {
    const { initializeApp } = appLib;
    
    // SENİN AYARLARIN (Burayı kontrol edeceğiz)
    const firebaseConfig = {
        apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
        authDomain: "tonm-77373.firebaseapp.com",
        projectId: "tonm-77373", 
        storageBucket: "tonm-77373.firebasestorage.app",
        messagingSenderId: "507031118335",
        appId: "1:507031118335:web:1d209e303dca154ec487ca",
        measurementId: "G-5EV1T50VK8"
    };

    const app = initializeApp(firebaseConfig);
    
    // Firestore'u çağır
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(async (fsLib) => {
        const { getFirestore, doc, setDoc } = fsLib;
        const db = getFirestore(app);
        
        console.log("TEST: Veritabanına yazılmaya çalışılıyor...");
        
        try {
            // Zorla bir kayıt yapmayı dene
            await setDoc(doc(db, "users", "TEST_KULLANICISI"), {
                bakiye: 9999,
                mesaj: "Bu kayıt konsoldan yapıldı",
                tarih: new Date().toISOString()
            });
            
            alert("✅ BAŞARILI! Veritabanı çalışıyor. Sorun senin kodlarında değilmiş.");
            console.log("✅ YAZMA BAŞARILI!");
        } catch (error) {
            alert("❌ HATA! Firebase yazmaya izin vermedi.\n\nHata: " + error.message);
            console.error("❌ KRİTİK HATA DETAYI:", error);
        }
    });
});
