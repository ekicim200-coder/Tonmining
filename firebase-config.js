// firebase-config.js (GÜNCEL HALİ)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// DİKKAT: Buradaki liste uzadı
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const db = getFirestore(app);

// DIŞARIYA AKTARILANLAR (Eksik varsa app.js çalışmaz)
window.firebaseDB = db;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;
window.firebaseDoc = doc;
window.firebaseCollection = collection;
window.firebaseAddDoc = addDoc;
window.firebaseGetDocs = getDocs;
window.firebaseQuery = query;
window.firebaseOrderBy = orderBy;

console.log("Firebase Yüklendi ve Hazır! ✅");
