<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Chain Mining Farm</title>

    <link rel="stylesheet" href="style.css">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&display=swap" rel="stylesheet">

    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js"></script>
</head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js"></script>
</head>
<body>

    <div class="dashboard-hero">
        <div class="hero-content">
            <div class="balance-group">
                <h2>Toplam Kazılan BTC</h2>
                <div class="balance-val"><span id="main-balance">0.00000000</span></div>
                <div id="sync-status" style="font-size:0.7rem; color:var(--primary); margin-top:5px; opacity:0.6;">Sistem aktif...</div>
            </div>
            
            <div class="stats-row">
                <div class="wallet-group">
                    <button id="btnWithdraw" class="connect-btn" style="background-color: #28a745; color: white; border: 1px solid #28a745;" onclick="window.open('withdraw.html', '_blank')">
                        <i class="fa-solid fa-money-bill-transfer"></i> <span>Çekim</span>
                    </button>
                </div>

                <div class="mini-stat"><label>Aktif Kullanıcı</label><div><span id="active-wallet-label" style="font-size:1rem; color:#888;">Giriş Yapılıyor...</span></div></div>
                <div class="mini-stat" style="border-color: var(--primary);"><label>Toplam Güç</label><div><span id="total-hash" style="color:var(--primary);">0</span> <small style="font-size:0.8rem; color:var(--primary);">TH/s</small></div></div>
            </div>
        </div>
    </div>

    <div class="middle-section">
        <div class="chart-container">
            <div class="panel-header">
                <div class="panel-title"><div id="chart-status-dot" class="live-dot green"></div> SİSTEM PERFORMANSI</div>
                <div style="font-size:0.8rem; color:#888;">Live Hashrate</div>
            </div>
            <canvas id="hashChart"></canvas>
        </div>
        <div class="terminal-container">
            <div class="panel-header" style="border:none; padding-bottom:5px; margin-bottom:5px;">
                <div class="panel-title" style="font-size:0.9rem; color:var(--text-muted);"> root@miner-pro:~# tail -f system.log</div>
            </div>
            <div class="terminal-logs" id="log-window"></div>
        </div>
    </div>

    <div class="machines-section">
        <div class="section-header"><i class="fa-solid fa-server"></i> MINING FARM DONANIMLARI</div>
        <div class="machine-grid" id="machine-container"></div>
    </div>

    <div id="ton-connect-trigger" style="display:none;"></div>

    <script src="script.js"></script>

    <script type="module">
        import { auth, db, signInAnonymously, onAuthStateChanged, doc, getDoc, setDoc, updateDoc } from './firebase-config.js';

        let userDocRef = null;
        let localBalance = 0;
        let lastSyncedBalance = 0;

        // Firebase Bekçisi: Giriş ve Veri Yükleme
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Kullanıcı kimliğini ekrana yaz
                document.getElementById('active-wallet-label').innerText = "ID: " + user.uid.substring(0,8);
                
                userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    localBalance = docSnap.data().balance || 0;
                    lastSyncedBalance = localBalance;
                } else {
                    await setDoc(userDocRef, { balance: 0, createdAt: new Date() });
                    localBalance = 0;
                }
                
                startMiningLogic();
            } else {
                signInAnonymously(auth);
            }
        });

        function startMiningLogic() {
            // HIZLI SAAT: Görsel olarak bakiyeyi saniyede bir artır (Sunucuyu yormaz)
            setInterval(() => {
                localBalance += 0.00001; // Kazım hızı
                document.getElementById('main-balance').innerText = localBalance.toFixed(8);
            }, 1000);

            // YAVAŞ SAAT: 30 saniyede bir buluta yedekle (Optimizasyon)
            setInterval(async () => {
                if (userDocRef && localBalance !== lastSyncedBalance) {
                    try {
                        await updateDoc(userDocRef, { balance: localBalance });
                        lastSyncedBalance = localBalance;
                        document.getElementById('sync-status').innerText = "Bulut güncellendi: " + new Date().toLocaleTimeString();
                    } catch (e) {
                        console.error("Senkronizasyon hatası:", e);
                    }
                }
            }, 30000);
        }
    </script>
<script src="script.js"></script>
</body>
</html>
