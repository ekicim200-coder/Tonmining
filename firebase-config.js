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

// --- KYC FONKSİYONLARI ---

// KYC durumunu kontrol et
export async function getKYCStatus(walletAddress) {
    if (!currentUser || !walletAddress) {
        console.error("❌ KYC kontrol hatası: Kullanıcı veya cüzdan bilgisi yok!");
        return { verified: false, status: 'none', details: null };
    }

    try {
        const kycRef = doc(db, "kyc", walletAddress);
        const kycSnap = await getDoc(kycRef);

        if (kycSnap.exists()) {
            const data = kycSnap.data();
            console.log("✅ KYC durumu okundu:", data.status);
            return {
                verified: data.status === 'approved',
                status: data.status, // 'none', 'pending', 'approved', 'rejected'
                details: data,
                submittedDate: data.submittedDate,
                approvedDate: data.approvedDate,
                rejectedReason: data.rejectedReason
            };
        } else {
            console.log("⚠️ KYC kaydı bulunamadı");
            return { verified: false, status: 'none', details: null };
        }
    } catch (error) {
        console.error("❌ KYC okuma hatası:", error);
        return { verified: false, status: 'error', details: null };
    }
}

// KYC başvurusu kaydet
export async function submitKYCRequest(walletAddress, kycData) {
    if (!currentUser || !walletAddress) {
        console.error("❌ KYC gönderme hatası!");
        return false;
    }

    try {
        const kycRef = doc(db, "kyc", walletAddress);
        
        await setDoc(kycRef, {
            walletAddress: walletAddress,
            userId: currentUser.uid,
            status: 'pending',
            submittedDate: Date.now(),
            kycUrl: kycData.kycUrl || null,
            userEmail: kycData.email || null,
            userName: kycData.name || null,
            approvedDate: null,
            rejectedReason: null,
            approvedBy: null
        }, { merge: true });
        
        console.log("✅ KYC başvurusu kaydedildi:", walletAddress);
        return true;
    } catch (error) {
        console.error("❌ KYC kaydetme hatası:", error);
        return false;
    }
}

// KYC onaylama (Admin işlevi - Firebase Rules ile korunmalı)
export async function approveKYC(walletAddress) {
    if (!currentUser) return false;

    try {
        const kycRef = doc(db, "kyc", walletAddress);
        
        await setDoc(kycRef, {
            status: 'approved',
            approvedDate: Date.now(),
            approvedBy: currentUser.uid
        }, { merge: true });
        
        console.log("✅ KYC onaylandı:", walletAddress);
        return true;
    } catch (error) {
        console.error("❌ KYC onaylama hatası:", error);
        return false;
    }
}

// KYC reddetme (Admin işlevi)
export async function rejectKYC(walletAddress, reason) {
    if (!currentUser) return false;

    try {
        const kycRef = doc(db, "kyc", walletAddress);
        
        await setDoc(kycRef, {
            status: 'rejected',
            rejectedReason: reason,
            rejectedDate: Date.now(),
            rejectedBy: currentUser.uid
        }, { merge: true });
        
        console.log("✅ KYC reddedildi:", walletAddress);
        return true;
    } catch (error) {
        console.error("❌ KYC reddetme hatası:", error);
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

// REFERANS SİSTEMİ FONKSİYONLARI
export async function saveReferralCode(walletAddress, referralCode) {
    if (!currentUser) {
        console.error("❌ Kullanıcı giriş yapmamış!");
        return false;
    }

    try {
        const userDocRef = doc(db, "users", walletAddress);
        await setDoc(userDocRef, {
            referralCode: referralCode,
            referralCount: 0,
            referralEarnings: 0
        }, { merge: true });
        
        console.log("✅ Referans kodu kaydedildi:", referralCode);
        return true;
    } catch (error) {
        console.error("❌ Referans kodu kaydetme hatası:", error);
        return false;
    }
}

export async function registerReferral(newUserWallet, referrerCode) {
    if (!currentUser) return false;

    try {
        // 1. ÖNCELİKLE: Kullanıcının daha önce referans kullanıp kullanmadığını kontrol et
        const newUserRef = doc(db, "users", newUserWallet);
        const newUserDoc = await getDoc(newUserRef);
        
        if (newUserDoc.exists() && newUserDoc.data().referredBy) {
            console.log("⚠️ Bu kullanıcı zaten bir referans kodu kullanmış!");
            return false;
        }

        // 2. Referans kodunun geçerli olup olmadığını kontrol et
        const q = query(
            collection(db, "users"),
            where("referralCode", "==", referrerCode)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log("⚠️ Geçersiz referans kodu");
            return false;
        }

        // 3. Referans sahibinin cüzdan adresini al
        let referrerWallet = null;
        querySnapshot.forEach((doc) => {
            referrerWallet = doc.id;
        });

        // 4. HİLE ÖNLEMESİ: Kendi kendine referans olamaz!
        if (referrerWallet === newUserWallet) {
            console.log("❌ Kendi kendine referans kullanamazsınız!");
            return false;
        }

        if (referrerWallet) {
            // 5. Yeni kullanıcının kaydına referans sahibini ekle
            await setDoc(newUserRef, {
                referredBy: referrerWallet,
                referredByCode: referrerCode,
                referralDate: Date.now(),
                referralLocked: true // Bir daha değiştirilemez
            }, { merge: true });

            // 6. Referans sahibinin sayacını artır
            const referrerRef = doc(db, "users", referrerWallet);
            const referrerDoc = await getDoc(referrerRef);
            
            if (referrerDoc.exists()) {
                const currentCount = referrerDoc.data().referralCount || 0;
                await setDoc(referrerRef, {
                    referralCount: currentCount + 1
                }, { merge: true });
            }

            console.log("✅ Referans kaydedildi:", referrerWallet);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("❌ Referans kaydetme hatası:", error);
        return false;
    }
}

export async function addReferralCommission(buyerWallet, machinePrice) {
    if (!currentUser) return false;

    try {
        // 1. Alıcının kaydını kontrol et
        const buyerRef = doc(db, "users", buyerWallet);
        const buyerDoc = await getDoc(buyerRef);
        
        if (!buyerDoc.exists() || !buyerDoc.data().referredBy) {
            console.log("ℹ️ Bu kullanıcı referans ile kaydolmamış");
            return false;
        }

        // 2. HİLE ÖNLEMESİ: referralLocked kontrolü
        if (!buyerDoc.data().referralLocked) {
            console.log("⚠️ Referans kilidi yok - hile olabilir!");
            return false;
        }

        const referrerWallet = buyerDoc.data().referredBy;
        
        // 3. HİLE ÖNLEMESİ: Kendi kendine komisyon alamaz
        if (referrerWallet === buyerWallet) {
            console.log("❌ Kendi kendine komisyon hilesi engellendi!");
            return false;
        }

        // 4. HİLE ÖNLEMESİ: Aynı satın alma için birden fazla komisyon önleme
        const purchaseId = `${buyerWallet}_${Date.now()}`;
        const commissionCheckRef = doc(db, "commissionCheck", purchaseId);
        const commissionCheckDoc = await getDoc(commissionCheckRef);
        
        if (commissionCheckDoc.exists()) {
            console.log("❌ Bu satın alma için zaten komisyon verilmiş!");
            return false;
        }

        const commission = machinePrice * 0.4; // %40 komisyon

        // 5. Referans sahibinin bakiyesine ekle
        const referrerRef = doc(db, "users", referrerWallet);
        const referrerDoc = await getDoc(referrerRef);
        
        if (referrerDoc.exists()) {
            const currentBalance = referrerDoc.data().balance || 0;
            const currentEarnings = referrerDoc.data().referralEarnings || 0;
            
            await setDoc(referrerRef, {
                balance: currentBalance + commission,
                referralEarnings: currentEarnings + commission,
                lastCommissionDate: Date.now()
            }, { merge: true });

            // 6. Komisyon kontrolü kaydet (tekrar önleme için)
            await setDoc(commissionCheckRef, {
                processed: true,
                timestamp: Date.now()
            });

            // 7. Referans geçmişi kaydet
            const historyId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const historyRef = doc(db, "referralHistory", historyId);
            
            await setDoc(historyRef, {
                referrerWallet: referrerWallet,
                buyerWallet: buyerWallet,
                commission: commission,
                machinePrice: machinePrice,
                date: Date.now(),
                verified: true
            });

            console.log(`✅ Referans komisyonu eklendi: ${commission} TON -> ${referrerWallet}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error("❌ Referans komisyonu ekleme hatası:", error);
        return false;
    }
}

export async function getReferralStats(walletAddress) {
    if (!walletAddress) return { count: 0, earnings: 0, history: [] };

    try {
        // Kullanıcı verilerini al
        const userRef = doc(db, "users", walletAddress);
        const userDoc = await getDoc(userRef);
        
        let count = 0;
        let earnings = 0;
        
        if (userDoc.exists()) {
            count = userDoc.data().referralCount || 0;
            earnings = userDoc.data().referralEarnings || 0;
        }

        // Referans geçmişini al
        const q = query(
            collection(db, "referralHistory"),
            where("referrerWallet", "==", walletAddress)
        );

        const querySnapshot = await getDocs(q);
        let history = [];
        
        querySnapshot.forEach((doc) => {
            history.push(doc.data());
        });

        history.sort((a, b) => b.date - a.date);
        
        return { count, earnings, history };
    } catch (error) {
        console.error("Referans istatistikleri çekilemedi:", error);
        return { count: 0, earnings: 0, history: [] };
    }
}

// LEADERBOARD FONKSİYONLARI
export async function getLeaderboard() {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        let users = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Sadece en az 1 referansı olanları dahil et
            if (data.referralCount && data.referralCount > 0) {
                users.push({
                    wallet: doc.id,
                    referralCount: data.referralCount || 0,
                    referralEarnings: data.referralEarnings || 0
                });
            }
        });

        // Referans sayısına göre sırala (çoktan aza)
        users.sort((a, b) => {
            if (b.referralCount !== a.referralCount) {
                return b.referralCount - a.referralCount;
            }
            // Eğer referans sayısı aynıysa, kazanç miktarına göre sırala
            return b.referralEarnings - a.referralEarnings;
        });

        // İlk 50 kişiyi al
        return users.slice(0, 50);
    } catch (error) {
        console.error("Leaderboard yüklenemedi:", error);
        return [];
    }
}

export async function getUserRank(walletAddress) {
    if (!walletAddress) return null;

    try {
        // Tüm kullanıcıları al
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        let users = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            users.push({
                wallet: doc.id,
                referralCount: data.referralCount || 0,
                referralEarnings: data.referralEarnings || 0
            });
        });

        // Sırala
        users.sort((a, b) => {
            if (b.referralCount !== a.referralCount) {
                return b.referralCount - a.referralCount;
            }
            return b.referralEarnings - a.referralEarnings;
        });

        // Kullanıcının sıralamasını bul
        const userIndex = users.findIndex(u => u.wallet === walletAddress);
        
        if (userIndex === -1) {
            return {
                rank: 0,
                referralCount: 0,
                referralEarnings: 0
            };
        }

        return {
            rank: userIndex + 1,
            referralCount: users[userIndex].referralCount,
            referralEarnings: users[userIndex].referralEarnings
        };
    } catch (error) {
        console.error("Kullanıcı sıralaması alınamadı:", error);
        return null;
    }
}

// ÖDÜL DAĞITIM FONKSİYONU (Admin tarafından manuel olarak çağrılır)
export async function distributeCompetitionPrizes() {
    if (!currentUser) {
        console.error("❌ Yetkisiz erişim!");
        return false;
    }

    try {
        const leaderboard = await getLeaderboard();
        
        if (leaderboard.length === 0) {
            console.log("⚠️ Yarışmaya katılım yok");
            return false;
        }

        const prizes = {
            1: 1000,   // 1. yer: 1000 TON
            2: 500,    // 2. yer: 500 TON
            3: 250,    // 3. yer: 250 TON
            4: 100, 5: 100, 6: 100, 7: 100, 8: 100, 9: 100, 10: 100, // 4-10: 100 TON
        };

        // 11-25 arası: 50 TON
        for (let i = 11; i <= 25; i++) {
            prizes[i] = 50;
        }

        // 26-50 arası: 25 TON
        for (let i = 26; i <= 50; i++) {
            prizes[i] = 25;
        }

        // Ödülleri dağıt
        for (let i = 0; i < leaderboard.length && i < 50; i++) {
            const user = leaderboard[i];
            const rank = i + 1;
            const prize = prizes[rank] || 0;

            if (prize > 0) {
                const userRef = doc(db, "users", user.wallet);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const currentBalance = userDoc.data().balance || 0;
                    
                    await setDoc(userRef, {
                        balance: currentBalance + prize,
                        competitionPrize: prize,
                        competitionRank: rank,
                        competitionDate: Date.now()
                    }, { merge: true });

                    console.log(`✅ Ödül verildi: ${user.wallet} - Sıra: ${rank} - Ödül: ${prize} TON`);
                }
            }
        }

        console.log("✅ Tüm ödüller dağıtıldı!");
        return true;
    } catch (error) {
        console.error("❌ Ödül dağıtım hatası:", error);
        return false;
    }
}
