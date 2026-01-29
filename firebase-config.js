// firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca"
};

// Bağlantıyı Başlat
try {
    firebase.initializeApp(firebaseConfig);
    
    // Veritabanını "window" içine atıyoruz ki app.js görebilsin
    window.db = firebase.firestore();
    
    console.log("🔥 Config Başarıyla Yüklendi.");
} catch (error) {
    alert("Config Hatası: " + error.message);
}
