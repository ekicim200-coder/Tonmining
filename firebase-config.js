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

// initializeApp hatasını bitiren satır:
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Bunları window'a atıyoruz ki app.js "Görmedim, duymadım" demesin.
window.db = firebase.firestore();
window.auth = firebase.auth();

console.log("🔥 Firebase Config OK.");
