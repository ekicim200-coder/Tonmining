// --- IMPORT ---
import { initAuth, getLeaderboard, getUserRank } from './firebase-config.js';

// --- TELEGRAM WEBAPP ---
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    console.log("✅ Telegram WebApp ready");
}

let tonConnectUI;
let currentUserUid = null;
let currentWallet = null;
let competitionEndDate = new Date('2026-03-10T23:59:59'); // Yarışma bitiş tarihi

// Initialize
function init() {
    initAuth((uid) => {
        currentUserUid = uid;
        console.log("✅ User:", uid);
    });

    setupTonConnect();
    loadLeaderboard();
    startTimer();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        loadLeaderboard();
    }, 30000);
}

// TonConnect Setup
async function setupTonConnect() {
    const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
    
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: manifestUrl,
        buttonRootId: null
    });

    tonConnectUI.onStatusChange(async (wallet) => {
        if (wallet) {
            currentWallet = wallet.account.address;
            await loadUserRank();
        } else {
            currentWallet = null;
            updateUserRankCard(null);
        }
    });

    const currentWalletState = tonConnectUI.wallet;
    if (currentWalletState) {
        currentWallet = currentWalletState.account.address;
        await loadUserRank();
    }
}

// Load Leaderboard
async function loadLeaderboard() {
    try {
        const leaderboardData = await getLeaderboard();
        renderPodium(leaderboardData.slice(0, 3));
        renderLeaderboardList(leaderboardData);
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        showToast("Failed to load leaderboard", true);
    }
}

// Load User Rank
async function loadUserRank() {
    if (!currentWallet) return;
    
    try {
        const userRankData = await getUserRank(currentWallet);
        updateUserRankCard(userRankData);
    } catch (error) {
        console.error("Error loading user rank:", error);
    }
}

// Render Podium (Top 3)
function renderPodium(topThree) {
    if (topThree.length === 0) return;

    const positions = ['rank2', 'rank1', 'rank3'];
    const medals = ['🥈', '🥇', '🥉'];
    
    topThree.forEach((user, index) => {
        const element = document.getElementById(positions[index]);
        if (!element) return;

        const walletShort = user.wallet.substring(0, 6) + '...' + user.wallet.substring(user.wallet.length - 4);
        
        element.querySelector('.podium-name').textContent = walletShort;
        element.querySelector('.podium-refs').textContent = `${user.referralCount} refs`;
        element.querySelector('.podium-avatar').textContent = (index === 1 ? 1 : index === 0 ? 2 : 3);
    });
}

// Render Leaderboard List
function renderLeaderboardList(leaderboard) {
    const listEl = document.getElementById('leaderboardList');
    if (!listEl) return;

    if (leaderboard.length === 0) {
        listEl.innerHTML = '<div class="loading-spinner"><p>No participants yet</p></div>';
        return;
    }

    let html = '';
    
    leaderboard.forEach((user, index) => {
        const rank = index + 1;
        const walletShort = user.wallet.substring(0, 6) + '...' + user.wallet.substring(user.wallet.length - 4);
        const isCurrentUser = currentWallet && user.wallet === currentWallet;
        const avatar = walletShort.substring(0, 2).toUpperCase();
        
        let rankClass = '';
        if (rank <= 3) {
            // Skip top 3 as they're in podium
            return;
        } else if (rank <= 10) {
            rankClass = 'top10';
        } else if (rank <= 25) {
            rankClass = 'top25';
        }

        html += `
        <div class="leaderboard-item ${isCurrentUser ? 'highlight' : ''}">
            <div class="lb-rank ${rankClass}">${rank}</div>
            <div class="lb-avatar">${avatar}</div>
            <div class="lb-info">
                <div class="lb-name">${isCurrentUser ? 'You' : walletShort}</div>
                <div class="lb-wallet">${user.wallet}</div>
            </div>
            <div class="lb-stats">
                <div class="lb-refs">${user.referralCount}</div>
                <div class="lb-label">Referrals</div>
            </div>
        </div>`;
    });

    listEl.innerHTML = html;
}

// Update User Rank Card
function updateUserRankCard(userData) {
    const userRank = document.getElementById('userRank');
    const userName = document.getElementById('userName');
    const userRefCount = document.getElementById('userRefCount');
    const userEarnings = document.getElementById('userEarnings');

    if (!userData || !currentWallet) {
        userRank.textContent = '-';
        userName.textContent = 'Connect Wallet';
        userRefCount.textContent = '0';
        userEarnings.textContent = '0';
        return;
    }

    const walletShort = currentWallet.substring(0, 6) + '...' + currentWallet.substring(currentWallet.length - 4);
    
    userRank.textContent = userData.rank > 50 ? '50+' : userData.rank;
    userName.textContent = walletShort;
    userRefCount.textContent = userData.referralCount || 0;
    userEarnings.textContent = (userData.referralEarnings || 0).toFixed(2);
}

// Competition Timer
function startTimer() {
    updateTimerDisplay();
    setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('competition-timer');
    if (!timerEl) return;

    const now = new Date();
    const diff = competitionEndDate - now;

    if (diff <= 0) {
        timerEl.textContent = 'Competition Ended';
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timerEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Tab Switching
window.switchTab = function(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active to selected tab
    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Navigation
window.goBack = function() {
    if (tg) {
        tg.close();
    } else {
        window.location.href = 'index.html';
    }
}

window.goToPage = function(page) {
    window.location.href = page;
}

// Toast
function showToast(msg, err = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.style.display = "block";
    t.style.border = err ? "1px solid #ff453a" : "1px solid #10b981";
    t.style.color = err ? "#ff453a" : "#10b981";
    setTimeout(() => t.style.display = "none", 2000);

    if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(err ? 'error' : 'success');
    }
}

// Initialize
init();
