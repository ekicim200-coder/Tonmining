// firebase-config.js

const firebaseConfig = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global değişkenler
window.firebaseDB = db;
window.firebaseDoc = doc;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;
window.firebaseAuthReady = false; // Auth durumunu kontrol için bayrak

// Auth Durumunu Dinle (Daha güvenli yöntem)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("🔐 Firebase User ID:", user.uid);
        window.firebaseAuthUID = user.uid;
        window.firebaseAuthReady = true;
    } else {
        // Oturum açılmamışsa anonim giriş yap
        signInAnonymously(auth).catch((error) => {
            console.error("Auth Error:", error);
        });
    }
});
