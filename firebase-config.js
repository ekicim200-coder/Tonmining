// firebase-config.js
// IMPORT YOK! index.html'deki script taglarından geliyor.

const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Değişkenleri window'a ata ki app.js erişebilsin
window.db = firebase.firestore();
window.auth = firebase.auth();
window.isFirebaseReady = true; // Bayrak

console.log("🔥 Firebase Config Yüklendi ve Hazır!");
