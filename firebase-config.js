// firebase-config.js

// 1. Firebase Ayarları
const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

// 2. Başlatma (Hata korumalı)
try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    
    // Veritabanını diğer dosyaların görmesi için PENCEREYE (Window) sabitliyoruz
    window.db = db; 
    
    console.log("✅ Firebase Bağlantısı Başarılı!");
} catch (error) {
    console.error("Firebase Hatası:", error);
    alert("Bağlantı Hatası: " + error.message);
}
