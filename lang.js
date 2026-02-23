// lang.js — Multi-language support
const LANG = {
    en: {
        // Header
        totalBalance: "TOTAL BALANCE",
        connect: "Connect",
        connected: "Connected",

        // Dashboard
        ghsUnit: "GH/s",
        networkStatus: "Network Status",
        offline: "Offline ○",
        mining: "Mining ●",
        active: "Active",
        activeDevices: "Active Devices",
        dailyTon: "Daily TON",
        freeNode: "FREE Node",
        freeNodeDesc: "+300 GH/s (30 min)",
        watch: "WATCH",
        joinChannel: "Join Our Channel",
        channelDesc: "News & giveaways",
        dailySpin: "Daily Spin",
        spinDesc: "Spin to win free TON!",
        nextSpinIn: "Next spin in",
        free: "FREE",

        // Rank
        bronze: "Bronze",
        silver: "Silver",
        gold: "Gold",
        diamond: "Diamond",
        legendary: "Legendary",
        maxRank: "MAX RANK",
        tonEarned: "TON earned",
        toNext: "to",

        // Spin
        dailyFortune: "Daily Fortune",
        spinToWin: "SPIN TO WIN",
        spinning: "Spinning...",
        addedBalance: "Added to your balance!",
        nextSpinInLabel: "Next spin in:",

        // Market
        hardwareStore: "Hardware Store",
        tonDay: "TON/day",
        roi: "ROI",
        days: "days",

        // Inventory
        myDevices: "My Devices",
        empty: "Empty",
        bonus: "BONUS",

        // Wallet
        withdraw: "Withdraw TON",
        enterAmount: "Enter Amount",
        minWithdraw: "Minimum 100 TON",
        walletAddress: "Wallet Address",
        withdrawBtn: "Withdraw",
        connectFirst: "Connect Wallet!",
        invalidAmount: "Invalid amount!",
        minRequired: "Minimum 100 TON",
        noBalance: "Not enough balance!",

        // Referral
        referralTitle: "Referral Program",
        yourCode: "Your Code",
        totalRefs: "Total Referrals",
        commission: "Commission",
        shareLink: "Share Referral Link",
        copied: "Copied!",
        
        // Info
        howItWorks: "How It Works",
        gettingStarted: "Getting Started",
        connectWallet: "Connect Your Wallet",
        connectWalletDesc: "Use TonConnect to securely link your TON wallet",
        purchaseHardware: "Purchase Hardware",
        purchaseHardwareDesc: "Buy mining devices to increase your hash power",
        startMining: "Start Mining",
        startMiningDesc: "Your devices automatically mine TON 24/7",
        withdrawEarnings: "Withdraw Earnings",
        withdrawEarningsDesc: "Withdraw your TON when you reach 100 TON minimum",
        howToEarn: "How to Earn",
        referralSystem: "Referral System",
        aboutUs: "About Us",
        partner: "Partner & Collaboration",
        needHelp: "Need Help?",
        contactSupport: "Contact Support",

        // Legal
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        lastUpdated: "Last Updated",
        
        // Toast
        offlineEarned: "Offline",
        sent: "Sending...",
        cancelled: "Cancelled",
        opening: "Opening..."
    },
    tr: {
        // Header
        totalBalance: "TOPLAM BAKİYE",
        connect: "Bağlan",
        connected: "Bağlı",

        // Dashboard
        ghsUnit: "GH/s",
        networkStatus: "Ağ Durumu",
        offline: "Çevrimdışı ○",
        mining: "Kazım Aktif ●",
        active: "Aktif",
        activeDevices: "Aktif Cihaz",
        dailyTon: "Günlük TON",
        freeNode: "ÜCRETSİZ Node",
        freeNodeDesc: "+300 GH/s (30 dk)",
        watch: "İZLE",
        joinChannel: "Kanalımıza Katıl",
        channelDesc: "Haberler ve çekilişler",
        dailySpin: "Günlük Çark",
        spinDesc: "Çevir, bedava TON kazan!",
        nextSpinIn: "Sonraki çevirme",
        free: "BEDAVA",

        // Rank
        bronze: "Bronz",
        silver: "Gümüş",
        gold: "Altın",
        diamond: "Elmas",
        legendary: "Efsanevi",
        maxRank: "MAKS SEVİYE",
        tonEarned: "TON kazanıldı",
        toNext: "→",

        // Spin
        dailyFortune: "Günlük Şans",
        spinToWin: "ÇEVİR & KAZAN",
        spinning: "Dönüyor...",
        addedBalance: "Bakiyenize eklendi!",
        nextSpinInLabel: "Sonraki çevirme:",

        // Market
        hardwareStore: "Donanım Mağazası",
        tonDay: "TON/gün",
        roi: "Amorti",
        days: "gün",

        // Inventory
        myDevices: "Cihazlarım",
        empty: "Boş",
        bonus: "BONUS",

        // Wallet
        withdraw: "TON Çek",
        enterAmount: "Miktar Girin",
        minWithdraw: "Minimum 100 TON",
        walletAddress: "Cüzdan Adresi",
        withdrawBtn: "Çekim Yap",
        connectFirst: "Cüzdan bağlayın!",
        invalidAmount: "Geçersiz miktar!",
        minRequired: "Minimum 100 TON",
        noBalance: "Yetersiz bakiye!",

        // Referral
        referralTitle: "Referans Programı",
        yourCode: "Kodunuz",
        totalRefs: "Toplam Referans",
        commission: "Komisyon",
        shareLink: "Referans Linkini Paylaş",
        copied: "Kopyalandı!",

        // Info
        howItWorks: "Nasıl Çalışır",
        gettingStarted: "Başlarken",
        connectWallet: "Cüzdanınızı Bağlayın",
        connectWalletDesc: "TonConnect ile TON cüzdanınızı güvenle bağlayın",
        purchaseHardware: "Donanım Satın Alın",
        purchaseHardwareDesc: "Hash gücünüzü artırmak için cihaz satın alın",
        startMining: "Kazıma Başlayın",
        startMiningDesc: "Cihazlarınız 7/24 otomatik TON kazıyor",
        withdrawEarnings: "Kazancınızı Çekin",
        withdrawEarningsDesc: "100 TON minimuma ulaştığınızda çekim yapın",
        howToEarn: "Nasıl Kazanılır",
        referralSystem: "Referans Sistemi",
        aboutUs: "Hakkımızda",
        partner: "İş Birliği & Ortaklık",
        needHelp: "Yardıma mı İhtiyacınız Var?",
        contactSupport: "Destek İletişim",

        // Legal
        terms: "Kullanım Şartları",
        privacy: "Gizlilik Politikası",
        lastUpdated: "Son Güncelleme",

        // Toast
        offlineEarned: "Çevrimdışı",
        sent: "Gönderiliyor...",
        cancelled: "İptal Edildi",
        opening: "Açılıyor..."
    }
};

// Detect language from Telegram or browser
function detectLanguage() {
    try {
        // Check saved preference
        const saved = localStorage.getItem('tonminer_lang');
        if (saved && LANG[saved]) return saved;

        // Check Telegram language
        if (window.Telegram && window.Telegram.WebApp) {
            const tgLang = window.Telegram.WebApp.initDataUnsafe?.user?.language_code;
            if (tgLang === 'tr') return 'tr';
        }

        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang && browserLang.startsWith('tr')) return 'tr';
    } catch (e) {}
    return 'en';
}

let currentLang = detectLanguage();

function t(key) {
    return (LANG[currentLang] && LANG[currentLang][key]) || (LANG.en[key]) || key;
}

function setLanguage(lang) {
    if (LANG[lang]) {
        currentLang = lang;
        localStorage.setItem('tonminer_lang', lang);
    }
}

export { LANG, t, currentLang, setLanguage, detectLanguage };
