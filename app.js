// --- KULLANICI KİMLİĞİ (SABİTLEME SİSTEMİ) ---
let userID;

// 1. Durum: Eğer Telegram içindeysek, gerçek Telegram ID'sini al
if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
    userID = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
    console.log("Telegram Kullanıcısı Tespit Edildi:", userID);
} 
// 2. Durum: Tarayıcıdaysak (Chrome/Opera), hafızaya bak
else {
    // Daha önce bu tarayıcıya ID kaydettik mi?
    let savedID = localStorage.getItem('nexus_player_id');
    
    if (savedID) {
        // Evet, eski ID'yi kullan (Böylece F5 atınca veri gitmez)
        userID = savedID;
        console.log("Eski Kullanıcı Geri Döndü:", userID);
    } else {
        // Hayır, ilk defa giriyor. Yeni ID oluştur ve hafızaya kaydet.
        userID = "user_" + Math.floor(Math.random() * 10000000);
        localStorage.setItem('nexus_player_id', userID);
        console.log("Yeni Kullanıcı Oluşturuldu:", userID);
    }
}
