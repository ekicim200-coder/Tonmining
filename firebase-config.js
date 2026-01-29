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

// Firebase SDK'yı import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase'i başlat
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
        console.error("❌ Auth Hatası:", error.code, error.message);
        // Fallback: LocalStorage kullan
        alert("⚠️ Firebase bağlantısı başarısız! Yerel depolama kullanılıyor.");
    });

// Global değişkenlere ata
window.firebaseDB = db;
window.firebaseAuth = auth;
window.firebaseDoc = doc;
window.firebaseSetDoc = setDoc;
window.firebaseGetDoc = getDoc;

console.log("🔥 Firebase başarıyla yüklendi!");
```

---

## 4️⃣ Test Et

### Tarayıcıda Test:
1. Siteyi aç
2. **F12** → **Console** sekmesi
3. Şu mesajları göreceksin:
```
🔥 Firebase başarıyla yüklendi!
🔐 Firebase Auth Başarılı! UID: kX9mP2nQ8rT5wL3hJ1vD
✅ Aktif Kullanıcı UID: kX9mP2nQ8rT5wL3hJ1vD
📥 Veri Buluttan Çekiliyor...
🆕 Yeni kullanıcı, varsayılan veri ile başlanıyor.
💾 Veri kaydedildi: kX9mP2nQ8rT5wL3hJ1vD
```

### İşlem Kontrolü:
1. Bir makine satın al (ör: Nano Node - 10 TON)
2. Sayfayı yenile (**F5** veya **Ctrl+R**)
3. ✅ Bakiye ve envanter korunmalı!

### Firebase Console'da Kontrol:
1. **Firestore Database → Data**
2. **users** koleksiyonunu aç
3. UID'nizi bulun (ör: `kX9mP2nQ8rT5wL3hJ1vD`)
4. Veri yapısı şöyle görünmeli:
```
📁 users
  📄 kX9mP2nQ8rT5wL3hJ1vD
      balance: 0
      hashrate: 100
      income: 0.0000077
      inventory: {1: 1}
      lastLogin: 1738164523000
      mining: true
      history: []
