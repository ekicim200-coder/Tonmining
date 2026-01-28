// app.js

// 1. ÖNCE FIREBASE'İ İÇERİ ALIYORUZ (IMPORT)
// Not: firebase-config.js dosyanın yolunun doğru olduğundan emin ol.
import { db, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs } from './firebase-config.js';

console.log("🚀 Oyun Başlatılıyor...");

// --- 2. KULLANICI KİMLİĞİ VE SABİTLER ---
const ROI_DAYS = 15;
const SECONDS_IN_DAY = 86400;

let userID = localStorage.getItem('nexus_player_id');
if (!userID) {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        userID = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
    } else {
        userID = "user_" + Math.floor(Math.random() * 10000000);
    }
    localStorage.setItem('nexus_player_id', userID);
}
console.log("👤 ID:", userID);

// --- 3. ÜRÜN LİSTESİ ---
const products = [
    { id: 1, name: "Nano Node",      priceTON: 10,  priceStars: 50,    hash: 100,  icon: "fa-microchip", color: "text-gray-400" },
    { id: 2, name: "Micro Rig",      priceTON: 30,  priceStars: 150,   hash: 300,  icon: "fa-memory",    color: "text-green-400" },
    { id: 3, name: "GTX Cluster",    priceTON: 60,  priceStars: 300,   hash: 600,  icon: "fa-server",    color: "text-cyan-400" },
    { id: 4, name: "RTX Farm",       priceTON: 90,  priceStars: 450,   hash: 900,  icon: "fa-layer-group", color: "text-blue-400" },
    { id: 5, name: "ASIC Junior",    priceTON: 120, priceStars: 600,   hash: 1200, icon: "fa-industry",  color: "text-purple-500" },
    { id: 6, name: "ASIC Pro",       priceTON: 150, priceStars: 750,   hash: 1500, icon: "fa-warehouse", color: "text-pink-500" },
    { id: 7, name: "Industrial Rack", priceTON: 180, priceStars: 900,   hash: 1800, icon: "fa-city",      color: "text-yellow-400" },
    { id: 8, name: "Quantum Core",   priceTON: 200, priceStars: 1000, hash: 2000, icon: "fa-atom",      color: "text-red-500" }
];
// Gelir hesaplaması
products.forEach(p => { p.income = p.priceTON / (ROI_DAYS * SECONDS_IN_DAY); });

// --- 4. OYUN DURUMU (STATE) ---
let gameState = {
    balance: 10.0000000, 
    mining: false,
    hashrate: 0,
    income: 0,
    inventory: {},
    lastLogin: Date.now()
};

// --- 5. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    renderMarket();
    showPage('dashboard');
    initChart();
    initBg();
    loadGame(); 

    // Event Listener'lar
    document.getElementById('btn-withdraw')?.addEventListener('click', processWithdraw);
    
    // Otomatik Kayıt
    setInterval(() => { saveGame(false); }, 30000); 
    window.addEventListener('beforeunload', () => { saveGame(true); });
});

// --- 6. VERİTABANI İŞLEMLERİ ---

async function saveGame(showIcon = true) {
    gameState.lastLogin = Date.now();
    const ind = document.getElementById('save-indicator');
    if(showIcon && ind) { 
        ind.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Saving...'; 
        ind.style.opacity = '1'; 
    }

    try {
        const userRef = doc(db, "users", userID);
        await setDoc(userRef, gameState, { merge: true });
        
        if(showIcon && ind) { 
            ind.innerHTML = '<i class="fa-solid fa-check"></i> Saved'; 
            setTimeout(() => { ind.style.opacity = '0'; }, 2000);
        }
    } catch (error) {
        console.error("Kayıt Hatası:", error);
    }
}

async function loadGame() {
    try {
        const userRef = doc(db, "users", userID);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            gameState = { ...gameState, ...docSnap.data() };
            console.log("✅ Veri Yüklendi");
            showToast("Cloud Data Loaded", "success");
        } else {
            console.log("🆕 Yeni Kayıt");
            saveGame(true);
        }
    } catch (error) {
        console.error("Yükleme Hatası:", error);
    }
    finalizeLoad();
}

function finalizeLoad() {
    recalcStats();
    // Offline Kazanç Hesaplama
    if (gameState.hashrate > 0 && gameState.lastLogin && gameState.income > 0) {
        const now = Date.now();
        const secondsPassed = (now - gameState.lastLogin) / 1000;
        if (secondsPassed > 10) {
            const earned = secondsPassed * gameState.income;
            gameState.balance += earned;
            if(document.getElementById('offline-amount')) 
                document.getElementById('offline-amount').innerText = earned.toFixed(7);
            if(document.getElementById('offline-modal'))
                document.getElementById('offline-modal').style.display = 'flex';
        }
    }
    
    if (gameState.hashrate > 0) { 
        gameState.mining = true; 
        activateSystem(); 
    } else { 
        deactivateSystem(); 
    }
    
    // Geçmişi yüklemiyoruz, onu Wallet sayfası açılınca yükleyeceğiz.
    updateUI();
}

async function processWithdraw() {
    const walletInput = document.getElementById('wallet-address');
    const amountInput = document.getElementById('withdraw-amount');
    
    if(!walletInput || !amountInput) return;

    const walletAddr = walletInput.value.trim();
    const val = parseFloat(amountInput.value);
    
    if (walletAddr.length < 5 || !val || val < 50 || val > gameState.balance) { 
        showToast("Invalid Request / Min 50 TON", 'error'); 
        return; 
    } 
    
    // Bakiyeden düş ve kaydet
    gameState.balance -= val;
    saveGame(true); 
    
    try {
        const withdrawRef = collection(db, "users", userID, "withdrawals");
        await addDoc(withdrawRef, {
            amount: val,
            addr: walletAddr,
            status: "Pending",
            date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
            timestamp: Date.now()
        });
        
        showToast("Request Sent", 'success');
        amountInput.value = '';
        fetchAndRenderHistory(); // Listeyi güncelle
    } catch (error) {
        console.error("Hata:", error);
        gameState.balance += val; // Hata olursa parayı iade et
        showToast("Error processing request", 'error');
    }
}

// --- 7. GEÇMİŞ İŞLEMLERİ (GÜNCELLENMİŞ VERSİYON) ---
async function fetchAndRenderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    // Yükleniyor ikonu göster
    list.innerHTML = '<div class="text-center text-gray-500 text-xs py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading history...</div>';

    try {
        const historyRef = collection(db, "users", userID, "withdrawals");
        // timestamp'e göre sırala (Yeniden eskiye)
        const q = query(historyRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        list.innerHTML = ''; // Temizle
        
        if (querySnapshot.empty) { 
            list.innerHTML = '<div class="text-center text-gray-500 text-sm py-10 italic">No transaction history found.</div>'; 
            return; 
        }

        querySnapshot.forEach((doc) => {
            const tx = doc.data();
            
            // Duruma göre renk ve ikon belirle
            let isSent = tx.status.toLowerCase().includes("send") || tx.status.toLowerCase().includes("sent");
            let statusColor = isSent ? "text-green-500" : "text-yellow-500";
            let icon = isSent ? "fa-check-circle" : "fa-clock";

            const item = document.createElement('div');
            item.className = "bg-black/30 p-4 rounded-xl flex justify-between items-center border border-gray-700 hover:border-gray-500 transition mb-2";
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-white/5 rounded-lg ${statusColor}"><i class="fa-solid ${icon}"></i></div>
                    <div>
                        <div class="text-xs text-gray-400">Withdrawal</div>
                        <div class="text-white font-bold digit-font">${tx.amount.toFixed(2)} TON</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs ${statusColor} font-bold flex items-center justify-end gap-1 uppercase">${tx.status}</div>
                    <div class="text-[10px] text-gray-500 font-mono mt-1">${tx.date}</div>
                </div>`;
            list.appendChild(item);
        });

    } catch (error) {
        console.error("Geçmiş Yükleme Hatası:", error);
        
        // Index hatası kontrolü
        if(error.message && error.message.includes("requires an index")) {
            console.warn("⚠️ FIREBASE INDEX GEREKLİ: Lütfen konsoldaki linke tıklayarak index oluşturun.");
        }
        
        list.innerHTML = '<div class="text-center text-red-400 text-xs py-4">History load failed.<br>Check console for permissions or index error.</div>';
    }
}

// --- 8. DİĞER FONKSİYONLAR ---

function closeModal() { 
    const m = document.getElementById('offline-modal');
    if(m) m.style.display = 'none'; 
}

function recalcStats() {
    let totalHash = 0; 
    let totalIncome = 0;
    products.forEach(p => { 
        if(gameState.inventory[p.id]) { 
            totalHash += p.hash * gameState.inventory[p.id]; 
            totalIncome += p.income * gameState.inventory[p.id]; 
        } 
    });
    gameState.hashrate = totalHash; 
    gameState.income = totalIncome;
}

function activateSystem() { 
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind) ind.className = "w-2 h-2 rounded-full bg-green-500 animate-pulse"; 
    if(txt) { txt.innerText = "ONLINE"; txt.className = "text-green-400 font-bold"; }
    startLoop(); 
}

function deactivateSystem() { 
    const ind = document.getElementById('status-indicator');
    const txt = document.getElementById('status-text');
    if(ind) ind.className = "w-2 h-2 rounded-full bg-gray-500"; 
    if(txt) { txt.innerText = "STANDBY"; txt.className = "text-gray-500 font-bold"; }
    clearInterval(minLoop); 
}

function buyWithTON(id) { 
    const p = products.find(x => x.id === id); 
    if(gameState.balance >= p.priceTON) { 
        gameState.balance -= p.priceTON; 
        addMachine(id); 
    } else { 
        showToast("Insufficient TON Balance", 'error'); 
    } 
}

function buyWithStars(id) { 
    showToast("Star Payment Simulation: Success (No Charge)", 'star'); 
}

function addMachine(id) { 
    const p = products.find(x => x.id === id); 
    if(!gameState.inventory[id]) gameState.inventory[id] = 0; 
    gameState.inventory[id]++; 
    
    if(!gameState.mining) { gameState.mining = true; activateSystem(); } 
    showToast(`Purchased ${p.name}!`, 'success'); 
    recalcStats(); 
    updateUI(); 
    renderMarket(); 
    saveGame(true); 
}

function renderMarket() {
    const list = document.getElementById('market-list'); 
    if(!list) return; 
    list.innerHTML = '';
    
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        const dailyInc = (p.income * 86400).toFixed(2);
        const div = document.createElement('div');
        div.className = "glass-panel p-5 rounded-2xl flex flex-col justify-between transition border border-gray-800 hover:border-cyan-500/50";
        div.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="p-4 bg-black/40 rounded-xl ${p.color} text-2xl shadow-inner border border-white/5"><i class="fa-solid ${p.icon}"></i></div>
                <div class="text-xs bg-gray-900 px-3 py-1 rounded-full text-gray-400 border border-gray-700">Owned: ${count}</div>
            </div>
            <div class="mb-4">
                <h3 class="font-bold text-lg text-white">${p.name}</h3>
                <div class="flex items-center gap-3 mt-2 text-xs"><span class="text-gray-400"><i class="fa-solid fa-bolt text-yellow-500"></i> ${p.hash} TH/s</span></div>
                <div class="text-xs text-green-400 mt-1 font-bold">+${dailyInc} TON / Day</div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.gameApp.buyWithTON(${p.id})" class="btn-ton-check w-1/2 btn-ton py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1" data-price="${p.priceTON}">${p.priceTON} TON</button>
                <button onclick="window.gameApp.buyWithStars(${p.id})" class="w-1/2 btn-star py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1">${p.priceStars} <i class="fa-solid fa-star text-white"></i></button>
            </div>`;
        list.appendChild(div);
    }); 
    updateUI();
}

function updateUI() {
    const b = gameState.balance.toFixed(7);
    if(document.getElementById('main-balance')) document.getElementById('main-balance').innerText = b + " TON";
    if(document.getElementById('mobile-balance')) document.getElementById('mobile-balance').innerText = b; 
    if(document.getElementById('wallet-balance-display')) document.getElementById('wallet-balance-display').innerText = b;
    
    if(document.getElementById('dash-hash')) document.getElementById('dash-hash').innerText = gameState.hashrate.toLocaleString();
    if(document.getElementById('dash-daily')) document.getElementById('dash-daily').innerText = (gameState.income * 86400).toFixed(2);
    if(document.getElementById('dash-income')) document.getElementById('dash-income').innerText = gameState.income.toFixed(7);
    if(document.getElementById('dash-devices')) document.getElementById('dash-devices').innerText = Object.values(gameState.inventory).reduce((a,b)=>a+b,0);
    
    document.querySelectorAll('.btn-ton-check').forEach(btn => { 
        const price = parseFloat(btn.getAttribute('data-price')); 
        btn.disabled = gameState.balance < price; 
    });
}

function renderInventory() {
    const list = document.getElementById('inventory-list'); 
    if(!list) return; 
    list.innerHTML = ''; 
    let empty = true;
    
    products.forEach(p => {
        const count = gameState.inventory[p.id] || 0;
        if(count > 0) { 
            empty = false; 
            const div = document.createElement('div'); 
            div.className = "glass-panel p-4 rounded-xl flex items-center gap-4 border-l-4 border-cyan-500 bg-gradient-to-r from-cyan-900/10 to-transparent"; 
            div.innerHTML = `
                <div class="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center ${p.color} text-2xl"><i class="fa-solid ${p.icon}"></i></div>
                <div class="flex-1">
                    <h4 class="font-bold text-white">${p.name}</h4>
                    <div class="text-xs text-gray-400">Total: <span class="text-white">${(p.hash * count).toLocaleString()} TH/s</span></div>
                </div>
                <div class="text-xl font-bold digit-font text-white bg-white/5 px-3 py-1 rounded-lg">x${count}</div>`; 
            list.appendChild(div); 
        }
    });
    if(empty) list.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-10 italic">Warehouse empty.</div>';
}

function showPage(pageId) { 
    // Tüm sayfaları gizle
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active')); 
    
    // İstenen sayfayı göster
    const target = document.getElementById('page-' + pageId); 
    if(target) target.classList.add('active'); 
    
    // Nav butonunu aktif yap
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active')); 
    const mob = document.getElementById('nav-' + pageId); 
    if(mob) mob.classList.add('active'); 
    
    // Sayfaya özel işlemler
    if(pageId === 'inventory') renderInventory(); 
    
    // === DÜZELTME BURADA YAPILDI: Wallet açılınca geçmişi çek ===
    if(pageId === 'wallet') fetchAndRenderHistory(); 
}

function showToast(message, type = 'info') { 
    const container = document.getElementById('toast-container'); 
    if(!container) return; 
    const toast = document.createElement('div'); 
    toast.className = `toast ${type}`; 
    let icon = type === 'error' ? 'fa-triangle-exclamation' : (type === 'star' ? 'fa-star' : 'fa-circle-check'); 
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`; 
    container.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 3000); 
}

// Chart ve Animasyonlar
let minLoop; 
function startLoop() { 
    clearInterval(minLoop); 
    minLoop = setInterval(() => { 
        gameState.balance += (gameState.income / 10); 
        updateUI(); 
        updateChart(gameState.hashrate); 
    }, 100); 
}

let chart; 
function initChart() { 
    const el = document.getElementById('miningChart'); 
    if(!el) return; 
    const ctxChart = el.getContext('2d'); 
    let gradient = ctxChart.createLinearGradient(0, 0, 0, 400); 
    gradient.addColorStop(0, 'rgba(0, 242, 255, 0.4)'); 
    gradient.addColorStop(1, 'rgba(0, 242, 255, 0)'); 
    
    chart = new Chart(ctxChart, { 
        type: 'line', 
        data: { labels: Array(20).fill(''), datasets: [{ data: Array(20).fill(0), borderColor: '#00f2ff', backgroundColor: gradient, borderWidth: 3, tension: 0.4, pointRadius: 0, fill: true }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false }, scales: { x: { display: false }, y: { display: false } }, animation: { duration: 0 } } 
    }); 
}

function updateChart(val) { 
    if(!chart) return; 
    const f = (Math.random() - 0.5) * (val * 0.15); 
    let v = val > 0 ? val + f : 0; 
    if(v<0) v=0; 
    chart.data.datasets[0].data.push(v); 
    chart.data.datasets[0].data.shift(); 
    chart.update(); 
}

function initBg() { 
    const cvs = document.getElementById('bg-canvas'); 
    if(!cvs) return; 
    const ctx = cvs.getContext('2d'); 
    let w, h; 
    const parts = []; 
    function resize() { w=window.innerWidth; h=window.innerHeight; cvs.width=w; cvs.height=h; parts.length=0; const c=Math.min(Math.floor(w/15),100); for(let i=0;i<c;i++) parts.push({x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.5, s:Math.random()*2+.5}); } 
    window.addEventListener('resize', resize); 
    resize(); 
    function anim() { 
        ctx.clearRect(0,0,w,h); 
        for(let i=0;i<parts.length;i++) { 
            let p=parts[i]; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1; 
            ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fillStyle=`rgba(0,242,255,${0.3+Math.random()*0.2})`; ctx.fill(); 
            for(let j=i+1;j<parts.length;j++) { 
                let p2=parts[j]; let d=Math.hypot(p.x-p2.x,p.y-p2.y); 
                if(d<120) { ctx.beginPath(); ctx.strokeStyle=`rgba(0,242,255,${1-d/120})`; ctx.lineWidth=0.5; ctx.moveTo(p.x,p.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); } 
            } 
        } 
        requestAnimationFrame(anim); 
    } 
    anim(); 
}

// Global Erişim
window.gameApp = { buyWithTON, buyWithStars, processWithdraw, closeModal, showPage, fetchAndRenderHistory };
