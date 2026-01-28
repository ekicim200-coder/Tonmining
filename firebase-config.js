// firebase-config.js

// Firebase Kütüphanelerini İçe Aktar (Modüler yapı yerine CDN global kullanımı)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- BURAYI KENDİ BİLGİLERİNLE DOLDUR ---
const firebaseConfig = {
    apiKey: "SENIN_API_KEY_BURAYA",
    authDomain: "SENIN_PROJECT_ID.firebaseapp.com",
    projectId: "SENIN_PROJECT_ID",
    storageBucket: "SENIN_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Bu fonksiyonları app.js'de kullanmak için dışarı açıyoruz
window.firebaseDB = db;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;
window.firebaseDoc = doc;

console.log("Firebase Bağlantısı Hazır!");