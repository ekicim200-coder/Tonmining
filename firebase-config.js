// firebase-config.js
// Firebase SDK'yı import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 👇 BURASI ÖNEMLİ: collection, query, where, getDocs EKLENDİ 👇
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ==================== CLAN SYSTEM ====================

export async function createClanInFire(clanData) {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    try {
        const clanId = 'CLN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
        const clanCode = clanId.substring(3, 9);
        
        const clanRef = doc(db, "clans", clanId);
        await setDoc(clanRef, {
            name: clanData.name,
            avatar: clanData.avatar || '⚔️',
            code: clanCode,
            leader: clanData.wallet,
            leaderUserId: currentUser.uid,
            members: [clanData.wallet],
            memberCount: 1,
            totalHashrate: clanData.hashrate || 0,
            createdAt: Date.now()
        });
        
        // Update user
        const userRef = doc(db, "users", clanData.wallet);
        await setDoc(userRef, { clanId: clanId }, { merge: true });
        
        return { success: true, clanId, clanCode };
    } catch (e) {
        console.error("Create clan error:", e);
        return { success: false, error: e.message };
    }
}

export async function joinClanInFire(clanCode, walletAddress, hashrate) {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    try {
        // Find clan by code
        const q = query(collection(db, "clans"), where("code", "==", clanCode.toUpperCase()));
        const snap = await getDocs(q);
        
        if (snap.empty) return { success: false, error: 'Clan not found' };
        
        let clanDoc = null;
        snap.forEach(d => { clanDoc = { id: d.id, ...d.data() }; });
        
        if (clanDoc.members.length >= 20) return { success: false, error: 'Clan is full (20/20)' };
        if (clanDoc.members.includes(walletAddress)) return { success: false, error: 'Already in this clan' };
        
        // Add member
        const clanRef = doc(db, "clans", clanDoc.id);
        const newMembers = [...clanDoc.members, walletAddress];
        await setDoc(clanRef, {
            members: newMembers,
            memberCount: newMembers.length,
            totalHashrate: (clanDoc.totalHashrate || 0) + (hashrate || 0)
        }, { merge: true });
        
        // Update user
        const userRef = doc(db, "users", walletAddress);
        await setDoc(userRef, { clanId: clanDoc.id }, { merge: true });
        
        return { success: true, clanId: clanDoc.id, clanName: clanDoc.name };
    } catch (e) {
        console.error("Join clan error:", e);
        return { success: false, error: e.message };
    }
}

export async function leaveClanInFire(walletAddress) {
    if (!currentUser) return { success: false };
    try {
        const userRef = doc(db, "users", walletAddress);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists() || !userDoc.data().clanId) return { success: false };
        
        const clanId = userDoc.data().clanId;
        const clanRef = doc(db, "clans", clanId);
        const clanDoc = await getDoc(clanRef);
        
        if (!clanDoc.exists()) {
            // Clan already deleted, just clear user
            await setDoc(userRef, { clanId: null }, { merge: true });
            return { success: true };
        }
        
        const data = clanDoc.data();
        const newMembers = data.members.filter(m => m !== walletAddress);
        
        if (newMembers.length === 0 || data.leader === walletAddress) {
            // Leader leaves or last member → delete clan
            // Other members will auto-detect on next load (clan gone → clear clanId)
            await deleteDoc(clanRef);
        } else {
            // Regular member leaves
            await setDoc(clanRef, {
                members: newMembers,
                memberCount: newMembers.length
            }, { merge: true });
        }
        
        // Clear own clanId
        await setDoc(userRef, { clanId: null }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Leave clan error:", e);
        return { success: false };
    }
}

export async function getClanData(clanId) {
    try {
        const clanRef = doc(db, "clans", clanId);
        const clanDoc = await getDoc(clanRef);
        if (!clanDoc.exists()) return null;
        
        const data = clanDoc.data();
        
        // Fetch member details
        let members = [];
        let totalHash = 0;
        for (const wallet of data.members) {
            const uRef = doc(db, "users", wallet);
            const uDoc = await getDoc(uRef);
            const uData = uDoc.exists() ? uDoc.data() : {};
            const h = uData.hashrate || 0;
            totalHash += h;
            members.push({
                wallet,
                hashrate: h,
                balance: uData.balance || 0,
                isLeader: wallet === data.leader
            });
        }
        members.sort((a, b) => b.hashrate - a.hashrate);
        
        // Update totalHashrate
        await setDoc(clanRef, { totalHashrate: totalHash }, { merge: true });
        
        return {
            id: clanId,
            name: data.name,
            avatar: data.avatar,
            code: data.code,
            leader: data.leader,
            members,
            memberCount: data.members.length,
            totalHashrate: totalHash,
            createdAt: data.createdAt
        };
    } catch (e) {
        console.error("Get clan error:", e);
        return null;
    }
}

export async function getClanLeaderboard() {
    try {
        const clansRef = collection(db, "clans");
        const snap = await getDocs(clansRef);
        
        let clans = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.memberCount > 0) {
                clans.push({
                    id: d.id,
                    name: data.name,
                    avatar: data.avatar || '⚔️',
                    memberCount: data.memberCount || 0,
                    totalHashrate: data.totalHashrate || 0,
                    leader: data.leader
                });
            }
        });
        
        clans.sort((a, b) => b.totalHashrate - a.totalHashrate);
        return clans.slice(0, 15);
    } catch (e) {
        console.error("Clan leaderboard error:", e);
        return [];
    }
}
