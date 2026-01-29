// firebase-config.js
// DÜZELTİLMİŞ VERSİYON

const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

// DİKKAT: Burada 'firebase.' öneki şarttır!
firebase.initializeApp(firebaseConfig);

// Veritabanı ve Auth araçlarını pencereye (window) sabitle
window.db = firebase.firestore();
window.auth = firebase.auth();

console.log("✅ Firebase (Compat Modu) Başlatıldı!");
