<script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    // BURADAKİ BİLGİLERİNİZİN DOĞRU OLDUĞUNDAN EMİN OLUN
    const firebaseConfig = {
        apiKey: "AIzaSyDXwByb4qNJeH5F9pYA8ry-zYcBhdzKsOo",
        authDomain: "tonm-77373.firebaseapp.com",
        projectId: "tonm-77373", // <-- Burası "SENIN_PROJECT_ID" OLMAMALI
        storageBucket: "tonm-77373.firebasestorage.app",
        messagingSenderId: "507031118335",
        appId: "1:507031118335:web:1d209e303dca154ec487ca"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log("Firebase Başlatıldı (Project ID: " + firebaseConfig.projectId + ")");

    window.nexusFirebase = {
        saveUserData: async (userId, data) => {
            try {
                await setDoc(doc(db, "users", userId), data, { merge: true });
                console.log("Kayıt Başarılı");
            } catch (e) {
                console.error("Kayıt Hatası:", e);
            }
        },
        loadUserData: async (userId) => {
            try {
                const docSnap = await getDoc(doc(db, "users", userId));
                return docSnap.exists() ? docSnap.data() : null;
            } catch (e) {
                console.error("Yükleme Hatası:", e);
                return null;
            }
        }
    };
</script>

<script src="app.js"></script>
</body>
</html>
