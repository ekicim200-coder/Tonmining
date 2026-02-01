// firebase-config.js
// Firebase SDK'yı import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 👇 BURASI ÖNEMLİ: collection, query, where, getDocs EKLENDİ 👇
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Config - SİZİN BİLGİLERİNİZ
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
        console.error("❌ Hata: Kullanıcı giriş yapmamış!");
        return false;
    }

    if (amount === undefined || amount === null) {
        console.error("❌ Hata: Çekilecek miktar (amount) belirtilmemiş!");
        return false;
    }

    const validAmount = Number(amount);
    
    if (isNaN(validAmount) || validAmount <= 0) {
         console.error("❌ Hata: Geçersiz miktar:", amount);
         return false;
    }

    try {
        const withdrawalId = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const withdrawalRef = doc(db, "withdrawals", withdrawalId);
        
        await setDoc(withdrawalRef, {
            walletAddress: walletAddress,
            amount: validAmount,
            status: "pending",
            requestDate: Date.now(),
            userId: currentUser.uid,
            processedDate: null
        });
        
        console.log("✅ Çekim talebi kaydedildi ID:", withdrawalId);
        return true;
    } catch (error) {
        console.error("❌ Çekim talebi veritabanı hatası:", error.code, error.message);
        return false;
    }
}

// 👇 EKSİK OLAN VE HATAYA SEBEP OLAN FONKSİYON 👇
export async function getHistoryFromFire(walletAddress) {
    if (!walletAddress) return [];

    try {
        // 'withdrawals' koleksiyonunda, cüzdan adresi bizimkiyle eşleşenleri bul
        const q = query(
            collection(db, "withdrawals"),
            where("walletAddress", "==", walletAddress)
        );

        const querySnapshot = await getDocs(q);
        let history = [];
        
        querySnapshot.forEach((doc) => {
            history.push(doc.data());
        });

        // Tarihe göre sırala (En yeni en üstte)
        history.sort((a, b) => b.requestDate - a.requestDate);
        
        return history;
    } catch (error) {
        console.error("Geçmiş çekilemedi:", error);
        return [];
    }
}
