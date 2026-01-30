// Firebase SDK'yı import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Config - SİZİN BİLGİLERİNİZİ BURAYA GİRİN
const firebaseConfig = {
  apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
  authDomain: "tonm-77373.firebaseapp.com",
  projectId: "tonm-77373",
  storageBucket: "tonm-77373.firebasestorage.app",
  messagingSenderId: "507031118335",
  appId: "1:507031118335:web:1d209e303dca154ec487ca",
  measurementId: "G-5EV1T50VK8"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// Anonim giriş fonksiyonu
export function initAuth(callback) {
    console.log("Firebase Auth başlatılıyor...");
    
    signInAnonymously(auth)
        .then(() => {
            console.log("Anonim giriş başarılı!");
        })
        .catch((error) => {
            console.error("Anonim giriş hatası:", error.code, error.message);
        });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("User authenticated:", user.uid);
            if (callback) callback(user.uid);
        } else {
            console.log("User signed out");
            currentUser = null;
        }
    });
}

// Firestore'a veri kaydet
export async function saveUserToFire(walletAddress, data) {
    if (!currentUser) {
        console.error("Kullanıcı giriş yapmamış!");
        return;
    }

    try {
        const userDocRef = doc(db, "users", walletAddress);
        await setDoc(userDocRef, {
            ...data,
            lastSave: Date.now(),
            userId: currentUser.uid
        }, { merge: true });
        
        console.log("✅ Firebase'e kaydedildi:", walletAddress);
        return true;
    } catch (error) {
        console.error("❌ Firebase kaydetme hatası:", error.code, error.message);
        return false;
    }
}

// Firestore'dan veri oku
export async function getUserFromFire(walletAddress) {
    if (!currentUser) {
        console.error("Kullanıcı giriş yapmamış!");
        return null;
    }

    try {
        const userDocRef = doc(db, "users", walletAddress);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            console.log("✅ Firebase'den veri okundu:", walletAddress);
            return docSnap.data();
        } else {
            console.log("⚠️ Veri bulunamadı:", walletAddress);
            return null;
        }
    } catch (error) {
        console.error("❌ Firebase okuma hatası:", error.code, error.message);
        return null;
    }
}

// Çekim talebi kaydet
export async function saveWithdrawalRequest(walletAddress, amount) {
    if (!currentUser) {
        console.error("Kullanıcı giriş yapmamış!");
        return false;
    }

    try {
        const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const withdrawalRef = doc(db, "withdrawals", withdrawalId);
        
        await setDoc(withdrawalRef, {
            walletAddress: walletAddress,
            amount: amount,
            status: "pending",
            requestDate: Date.now(),
            userId: currentUser.uid,
            processedDate: null
        });
        
        console.log("✅ Çekim talebi kaydedildi:", withdrawalId);
        return true;
    } catch (error) {
        console.error("❌ Çekim talebi kaydetme hatası:", error.code, error.message);
        return false;
    }
}
