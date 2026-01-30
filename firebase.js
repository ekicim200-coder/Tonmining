// firebase-config.js

// Firebase SDK'larını global pencereye yüklüyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
  authDomain: "tonm-77373.firebaseapp.com",
  projectId: "tonm-77373",
  storageBucket: "tonm-77373.firebasestorage.app",
  messagingSenderId: "507031118335",
  appId: "1:507031118335:web:1d209e303dca154ec487ca",
  measurementId: "G-5EV1T50VK8"
};

// Uygulamayı başlat
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Global pencereye (window) "NexusFirebase" adında bir araç kutusu ekliyoruz.
// Bu sayede app.js dosyası buraya erişebilecek.
window.NexusFirebase = {
    db: db,
    doc: doc,
    getDoc: getDoc,
    setDoc: setDoc,
    analytics: analytics
};

console.log("🔥 Firebase Bağlantısı Hazır!");
