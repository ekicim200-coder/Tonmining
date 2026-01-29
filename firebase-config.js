// Eğer daha önce tanımlandıysa hata vermemesi için kontrol ekledik
var config = {
    apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
    authDomain: "tonm-77373.firebaseapp.com",
    projectId: "tonm-77373",
    storageBucket: "tonm-77373.firebasestorage.app",
    messagingSenderId: "507031118335",
    appId: "1:507031118335:web:1d209e303dca154ec487ca",
    measurementId: "G-5EV1T50VK8"
};

if (!firebase.apps.length) {
    firebase.initializeApp(config);
}

// Global veritabanı değişkenini tanımla
window.db = firebase.firestore();
console.log("✅ Firebase ve DB başarıyla bağlandı.");
