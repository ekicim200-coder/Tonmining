// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Auth modüllerini ekledik
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// BURAYI KENDİ BİLGİLERİNLE DOLDUR
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
const auth = getAuth(app); // Auth servisini başlat

// --- AUTH FONKSİYONLARI ---

// Site açılınca bu fonksiyonu çağıracağız
export function initAuth(onLoginSuccess) {
    // Kullanıcı durumunu dinle
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Zaten giriş yapmış
            console.log("🔥 Anonim ID:", user.uid);
            if(onLoginSuccess) onLoginSuccess(user.uid);
        } else {
            // Giriş yapmamışsa Anonim giriş yap
            signInAnonymously(auth)
                .then(() => {
                    console.log("🔥 Yeni Anonim Giriş Yapıldı.");
                })
                .catch((error) => {
                    console.error("🔥 Giriş Hatası:", error);
                });
        }
    });
}

// --- VERİTABANI FONKSİYONLARI ---

export async function saveUserToFire(walletAddress, data) {
    if (!walletAddress || !auth.currentUser) return; // Giriş yapmamışsa kaydetme
    
    try {
        const userRef = doc(db, "users", walletAddress);
        await setDoc(userRef, {
            ...data,
            lastSave: Date.now(),
            uid: auth.currentUser.uid // Hangi anonim user yazdı, onu da ekleyelim (Opsiyonel)
        }, { merge: true });
        console.log("🔥 Kayıt Başarılı.");
    } catch (e) {
        console.error("🔥 Kayıt Hatası:", e);
    }
}

export async function getUserFromFire(walletAddress) {
    if (!walletAddress) return null;
    try {
        const userRef = doc(db, "users", walletAddress);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (e) {
        console.error("🔥 Okuma Hatası:", e);
        return null;
    }
}