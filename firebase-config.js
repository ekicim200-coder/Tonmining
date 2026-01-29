// firebase-config.js

// 1. SENİN PROJE BİLGİLERİN
const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

// 2. BAĞLANTIYI BAŞLAT (Eski Usül - Garanti Yöntem)
let db;

try {
    // Firebase zaten yüklü mü kontrol et
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Veritabanını başlat ve herkesin kullanımına aç
    db = firebase.firestore();
    window.db = db; // Global yapıyoruz ki diğer dosyalar görsün

    console.log("🔥 Veritabanı Bağlantısı KURULDU.");
    
} catch (error) {
    console.error("Firebase Başlatma Hatası:", error);
    alert("Veritabanına bağlanılamadı! İnternetini kontrol et.");
}
