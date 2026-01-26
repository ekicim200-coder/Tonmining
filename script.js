// --- 1. AYARLAR: KENDİ CÜZDAN ADRESLERİNİ BURAYA YAZ ---
const RECEIVER_EVM = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7"; // MetaMask/Trust (ETH/BNB)
const RECEIVER_TON = "UQB..........SENİN_TON_ADRESİN_BURAYA..........."; // Telegram TON Adresi
// -------------------------------------------------------

let currentChain = null; // 'EVM' or 'TON'
let userAddress = null;
let provider, signer;
let minedBTC = 0.00000000;

// --- TON CONNECT KURULUMU ---
// DİKKAT: 'tonconnect-manifest.json' dosyasının sitenizin ana dizininde olması gerekir.
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: window.location.origin + '/tonconnect-manifest.json', 
    buttonRootId: 'ton-connect-trigger'
});

// Makineler (Hem ETH hem TON Fiyatı var)
const machines = [
    { id: 1, name: "Genesis Pickaxe", desc: "Dijital başlangıç.", priceEth: 0, priceTon: 0, hashrate: 15, daily: 0.00000500, owned: true, artHtml: `<img src="https://cdn-icons-png.flaticon.com/512/8637/8637379.png" alt="Pickaxe" style="filter: drop-shadow(0 0 15px rgba(247, 147, 26, 0.6)); animation: pulse 2s infinite;">` },
    { id: 2, name: "Dual RTX Rig", desc: "Giriş seviyesi GPU.", priceEth: 0.01, priceTon: 5, hashrate: 85, daily: 0.00003500, owned: false, artHtml: `<div class="art-gpu-real"><div class="gpu-fan-unit-real"><div class="fan-blades-real"></div></div><div class="gpu-fan-unit-real"><div class="fan-blades-real"></div></div><div class="rgb-strip-real"></div></div>` },
    { id: 3, name: "Hexa-GPU Frame", desc: "6 Kartlı açık sistem.", priceEth: 0.03, priceTon: 15, hashrate: 350, daily: 0.00015000, owned: false, artHtml: `<div class="art-hexa-toon"><div class="rig-base-toon"></div>${'<div class="gpu-toon"><div class="led-strip-toon"></div><div class="fan-toon"></div></div>'.repeat(6)}</div>` },
    { id: 4, name: "AntMiner L7", desc: "Endüstriyel ASIC.", priceEth: 0.07, priceTon: 35, hashrate: 950, daily: 0.00045000, owned: false, artHtml: `<div class="art-l7-classic"><div class="l7-c-top"><div class="led g"></div><div class="led g"></div></div><div class="l7-c-body"><div class="l7-c-fan"><div class="fan-blades-real" style="opacity:0.6;"></div></div><div class="l7-c-fan"><div class="fan-blades-real" style="opacity:0.6;"></div></div></div></div>` },
    { id: 5, name: "Rack Cabinet", desc: "Tam dolu kabin.", priceEth: 0.15, priceTon: 75, hashrate: 2800, daily: 0.00150000, owned: false, artHtml: `<div class="art-rack-real"><div class="rack-units-real">${'<div class="unit-real"><div class="led g"></div></div>'.repeat(7)}</div></div>` },
    { id: 6, name: "Quantum DC", desc: "Veri merkezi.", priceEth: 0.3, priceTon: 150, hashrate: 9500, daily: 0.00550000, owned: false, artHtml: `<div class="art-dc-enhanced"><div class="dc-light-beam"></div><div class="dc-floor-glow"></div><div class="dc-racks" style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; justify-content:space-between;"><div class="dc-rack-row left">${'<div class="dc-server"><div class="mini-led g"></div><div class="mini-led g" style="animation-delay:0.2s"></div><div class="mini-led g" style="animation-delay:0.4s"></div></div>'.repeat(8)}</div><div class="dc-rack-row right">${'<div class="dc-server"><div class="mini-led b"></div><div class="mini-led b" style="animation-delay:0.3s"></div></div>'.repeat(8)}</div></div></div>` }
];

// --- EVM BAĞLANTISI (MetaMask/Trust) ---
async function connectEVM() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            currentChain = 'EVM';
            updateUIConnected('EVM', userAddress);
        } catch (error) { console.error(error); addLog("EVM Connection Failed", "error"); }
    } else {
        // Mobil Deep Link
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            window.location.href = "https://metamask.app.link/dapp/" + window.location.href.replace(/^https?:\/\//, '');
        } else { alert("MetaMask kurulu değil!"); }
    }
}

// --- TON BAĞLANTISI (Telegram) ---
async function connectTON() {
    try {
        await tonConnectUI.openModal();
    } catch(e) { console.log(e); }
}

// TON Bağlantı Durumunu Dinle
tonConnectUI.onStatusChange(wallet => {
    if (wallet) {
        userAddress = wallet.account.address; // Raw address
        currentChain = 'TON';
        updateUIConnected('TON', userAddress.substring(0,6) + "...");
    } else {
        // Disconnect
        currentChain = null;
        userAddress = null;
        document.getElementById('active-wallet-label').innerText = "Yok";
        document.getElementById('btnTon').classList.remove('connected');
        renderMachines();
    }
});

function updateUIConnected(type, addr) {
    document.getElementById('active-wallet-label').innerText = `${type} (${addr.substring(0,4)}..)`;
    document.getElementById('active-wallet-label').style.color = type === 'EVM' ? 'var(--primary)' : 'var(--ton-blue)';
    
    if(type === 'EVM') {
        document.getElementById('btnEvm').classList.add('connected');
        document.getElementById('btnTon').classList.remove('connected');
    } else {
        document.getElementById('btnTon').classList.add('connected');
        document.getElementById('btnEvm').classList.remove('connected');
    }
    addLog(`${type} Wallet Connected!`, "success");
    renderMachines();
}

// --- ÖDEME İŞLEMLERİ (AKILLI SEÇİM) ---
async function buyMachine(id) {
    if (!currentChain) { alert("Lütfen önce bir cüzdan bağlayın!"); return; }
    let m = machines.find(x => x.id === id);

    if (currentChain === 'EVM') {
        // --- ETHEREUM / BNB ÖDEMESİ ---
        try {
            addLog(`Sending ETH Transaction...`, "info");
            const tx = { to: RECEIVER_EVM, value: ethers.utils.parseEther(m.priceEth.toString()) };
            const transaction = await signer.sendTransaction(tx);
            addLog(`EVM Tx Sent: ${transaction.hash.substring(0,8)}...`, "info");
            await transaction.wait();
            completePurchase(m);
        } catch (err) { addLog("EVM Transaction Failed", "error"); }

    } else if (currentChain === 'TON') {
        // --- TON ÖDEMESİ ---
        try {
            addLog(`Sending TON Transaction...`, "info");
            // TON Nano formatına çevir (1 TON = 1,000,000,000 Nano)
            const nanoAmount = (m.priceTon * 1000000000).toString();
            
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sn geçerli
                messages: [
                    {
                        address: RECEIVER_TON,
                        amount: nanoAmount,
                    }
                ]
            };
            
            const result = await tonConnectUI.sendTransaction(transaction);
            addLog(`TON Tx Sent!`, "success");
            completePurchase(m);
        } catch (err) { console.log(err); addLog("TON Transaction Failed/Cancelled", "error"); }
    }
}

function completePurchase(m) {
    addLog(`Purchase Successful: ${m.name}`, "success");
    m.owned = true;
    renderMachines();
}

// --- UI RENDER ---
function renderMachines() {
    const container = document.getElementById('machine-container'); container.innerHTML = "";
    machines.forEach(m => {
        let activeClass = m.owned ? "active" : ""; let btnClass = m.owned ? "owned" : "";
        
        // Fiyatı Cüzdana Göre Göster
        let priceDisplay = "0";
        if(m.priceEth === 0) priceDisplay = "FREE";
        else if(currentChain === 'TON') priceDisplay = `${m.priceTon} TON`;
        else priceDisplay = `${m.priceEth} ETH`;

        let btnText = m.owned ? "ÇALIŞIYOR" : `SATIN AL (${priceDisplay})`;
        let statusBadge = m.owned ? `<div class="status-badge">ONLINE</div>` : `<div class="status-badge" style="color:#666; border-color:#333;">LOCKED</div>`;
        let btnAction = m.owned ? "" : `onclick="buyMachine(${m.id})"`;
        
        let html = `<div class="machine-card ${activeClass}">${statusBadge}<div class="img-area">${m.artHtml}</div><div class="card-info"><div class="m-name">${m.name}</div><div style="font-size:0.85rem; color:#888; margin-bottom:10px;">${m.desc}</div><div class="m-stats"><div class="stat-box"><span>GÜÇ</span><strong>${m.hashrate} TH</strong></div><div class="stat-box" style="text-align:right;"><span>GETİRİ</span><strong style="color:var(--accent);">${m.daily}</strong></div></div>
        <div class="price-tag"><b>ETH: ${m.priceEth}</b> <b>TON: ${m.priceTon}</b></div>
        <button class="action-btn ${btnClass}" ${btnAction}>${btnText}</button></div></div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
    updateStats();
}
function updateStats() { let owned = machines.filter(m => m.owned); document.getElementById('total-hash').innerText = owned.reduce((a,b)=>a+b.hashrate,0); }

// --- LOG & CHART SİSTEMİ ---
let logWindow = document.getElementById('log-window');
function addLog(msg, type="info") {
    let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second:'2-digit' });
    let color = type === "error" ? "var(--danger)" : (type==="success" ? "var(--accent)" : "#00ff88");
    let html = `<div class="log-line" style="color:${color};"><span class="log-time">${time}</span> ${msg}</div>`;
    logWindow.insertAdjacentHTML('beforeend', html);
    if(logWindow.children.length > 8) logWindow.removeChild(logWindow.firstChild);
}

const ctx = document.getElementById('hashChart').getContext('2d');
const DATA_POINTS = 50;
let targetData = new Array(DATA_POINTS).fill(10); 
let currentData = new Array(DATA_POINTS).fill(10); 
function updateChartData() {
    let currentHashbase = parseInt(document.getElementById('total-hash').innerText) || 50;
    let volatility = Math.random() * 30 - 15;
    let newDataPoint = Math.max(5, currentHashbase + volatility);
    targetData.push(newDataPoint); targetData.shift();
    currentData.shift(); currentData.push(currentData[currentData.length-1]); 
}
function animateChart() {
    requestAnimationFrame(animateChart);
    let canvas = document.getElementById('hashChart');
    if(canvas.width !== canvas.offsetWidth) { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
    let w = canvas.width; let h = canvas.height;
    for(let i=0; i<DATA_POINTS; i++) { let diff = targetData[i] - currentData[i]; currentData[i] += diff * 0.05; }
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = "#00ff88"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath();
    let step = w / (DATA_POINTS - 1);
    let maxVal = Math.max(...targetData, parseInt(document.getElementById('total-hash').innerText)*1.2 || 100);
    for(let i=0; i<DATA_POINTS; i++) {
        let y = h - ((currentData[i]) / (maxVal) * (h * 0.8) + 20);
        if(i===0) ctx.moveTo(0, y); else ctx.lineTo(i * step, y);
    }
    ctx.stroke();
}
setInterval(() => { let daily = machines.filter(m => m.owned).reduce((a,b)=>a+b.daily,0); minedBTC += daily / 86400; document.getElementById('main-balance').innerText = minedBTC.toFixed(8); }, 1000);
setInterval(updateChartData, 1000); animateChart(); 
addLog("System initialized.", "info");
renderMachines();