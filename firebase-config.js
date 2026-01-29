// firebase-config.js

// Firebase Kütüphanelerini İçe Aktar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SENİN BİLGİLERİN (DÜZELTİLMİŞ HALİ) ---
const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
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
