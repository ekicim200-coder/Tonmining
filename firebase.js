// firebase-config.js

// Firebase modüllerini CDN üzerinden çekiyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Senin yapılandırma bilgilerin
const firebaseConfig = {
  apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
  authDomain: "tonm-77373.firebaseapp.com",
  projectId: "tonm-77373",
  storageBucket: "tonm-77373.firebasestorage.app",
  messagingSenderId: "507031118335",
  appId: "1:507031118335:web:1d209e303dca154ec487ca",
  measurementId: "G-5EV1T50VK8"
};

// Başlatma işlemleri
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Veritabanını başlat

// Dışa aktar
export { app, analytics, db };
