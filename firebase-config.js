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
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Anonim giriş yap
signInAnonymously(auth)
    .then((userCredential) => {
        console.log("🔐 Firebase Auth Başarılı! UID:", userCredential.user.uid);
        window.firebaseAuthUID = userCredential.user.uid;
    })
    .catch((error) => {
        console.error("❌ Auth Hatası:", error);
    });

window.firebaseDB = db;
window.firebaseAuth = auth;
window.firebaseDoc = doc;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;

console.log("🔥 Firebase başarıyla yüklendi!");
