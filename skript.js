import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyD-5CPzp5iwNHUxloFkDBf3J8gRlUpbGVc",
    authDomain: "ton-not.firebaseapp.com",
    databaseURL: "https://ton-not-default-rtdb.firebaseio.com",
    projectId: "ton-not",
    storageBucket: "ton-not.appspot.com",
    messagingSenderId: "729333286761",
    appId: "1:729333286761:web:741fdeb1572cc1908bdff8",
    measurementId: "G-JKCWNWTLBT"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

let balance = 2500;
let energy = 1000;
let maxEnergy = 1000;
let upgradeLevel = 0;
let rechargeLevel = 0;
let tapLevel = 0;
let energyRechargeRate = 1;
let tapMultiplier = 1;
let baseCost = 500;
let selectedBoost = null;
let lastUpdateTime = Date.now(); // Зберігає час останнього оновлення

let telegramUserId = null;

function getTelegramUserId() {
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe.user;
    if (user) {
        telegramUserId = user.id;
        document.getElementById('result').innerText = `Ваш Telegram ID: ${telegramUserId}`;
    } else {
        document.getElementById('result').innerText = 'Не вдалося отримати ваш Telegram ID.';
    }
}

function saveDataToFirebase() {
    if (telegramUserId) {
        const userRef = ref(db, `users/${telegramUserId}`);
        set(userRef, {
            balance: balance,
            energy: energy,
            maxEnergy: maxEnergy,
            upgradeLevel: upgradeLevel,
            rechargeLevel: rechargeLevel,
            tapLevel: tapLevel,
            energyRechargeRate: energyRechargeRate,
            tapMultiplier: tapMultiplier,
            lastUpdateTime: Date.now() // Зберігаємо час останнього оновлення енергії
        });
    }
}

function loadDataFromFirebase() {
    if (telegramUserId) {
        const userRef = ref(db, `users/${telegramUserId}`);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                balance = data.balance || balance;
                energy = data.energy || energy;
                maxEnergy = data.maxEnergy || maxEnergy;
                upgradeLevel = data.upgradeLevel || upgradeLevel;
                rechargeLevel = data.rechargeLevel || rechargeLevel;
                tapLevel = data.tapLevel || tapLevel;
                energyRechargeRate = data.energyRechargeRate || energyRechargeRate;
                tapMultiplier = data.tapMultiplier || tapMultiplier;
                lastUpdateTime = data.lastUpdateTime || Date.now(); // Завантажуємо час останнього оновлення
                updateEnergyInBackground(); // Оновлюємо енергію при завантаженні даних
                updateDisplay();
            }
        });
    }
}

// Оновлює енергію, враховуючи час, коли користувач був неактивний
function updateEnergyInBackground() {
    const currentTime = Date.now();
    const timeElapsed = (currentTime - lastUpdateTime) / 1000; // у секундах
    const energyGained = Math.floor(timeElapsed * energyRechargeRate);

    if (energy < maxEnergy) {
        energy = Math.min(energy + energyGained, maxEnergy);
        updateDisplay();
    }
    lastUpdateTime = currentTime;
}

function updateDisplay() {
    document.querySelector('.balance').innerText = balance.toLocaleString();
    document.querySelector('.energy').innerText = `⚡ ${energy} / ${maxEnergy}`;
    document.querySelector('.progress').style.width = `${(energy / maxEnergy) * 100}%`;
    updateBoostCost();
}

function updateBoostCost() {
    const energyLimitCost = baseCost + (upgradeLevel * 500);
    document.querySelector('.boost-item[data-boost="energy-limit"] .boost-cost').innerText = energyLimitCost.toLocaleString();

    const rechargeSpeedCost = 1000 + (rechargeLevel * 1000);
    document.querySelector('.boost-item[data-boost="energy-recharge-speed"] .boost-cost').innerText = rechargeSpeedCost.toLocaleString();

    const tapMultiplierCost = baseCost + (tapLevel * 500);
    document.querySelector('.boost-item[data-boost="multitap"] .boost-cost').innerText = tapMultiplierCost.toLocaleString();
}

function showMessage(message) {
    const messageElement = document.querySelector('.message');
    messageElement.innerText = message;
    messageElement.classList.add('show');
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 3000);
}

function showConfirmModal(boost) {
    selectedBoost = boost;
    const level = parseInt(boost.querySelector('.boost-level').innerText) + 1;
    let cost;
    if (boost.dataset.boost === 'energy-limit') {
        cost = baseCost + (level - 1) * 500;
    } else if (boost.dataset.boost === 'energy-recharge-speed') {
        cost = 1000 + (level - 1) * 1000;
    } else if (boost.dataset.boost === 'multitap') {
        cost = baseCost + (level - 1) * 500;
    }
    document.getElementById('confirmText').innerText = `Ви впевнені, що хочете купити ${boost.querySelector('.boost-name').innerText} (Level ${level}) за ${cost.toLocaleString()} балів?`;
    document.getElementById('confirmModal').style.display = 'block';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    selectedBoost = null;
}

function showInsufficientFundsModal() {
    document.getElementById('insufficientFundsModal').style.display = 'block';
}

document.getElementById('insufficientFundsOk').addEventListener('click', () => {
    document.getElementById('insufficientFundsModal').style.display = 'none';
});

document.getElementById('confirmYes').addEventListener('click', () => {
    if (selectedBoost) {
        processPurchase(selectedBoost);
        closeConfirmModal();
    }
});

document.getElementById('confirmNo').addEventListener('click', () => {
    closeConfirmModal();
});

function processPurchase(item) {
    if (item.classList.contains('disabled')) {
        showMessage('Цей буст вже на максимальному рівні.');
        return;
    }
    const level = parseInt(item.querySelector('.boost-level').innerText) + 1;
    let cost;
    if (item.dataset.boost === 'energy-limit') {
        cost = baseCost + (level - 1) * 500;
    } else if (item.dataset.boost === 'energy-recharge-speed') {
        cost = 1000 + (level - 1) * 1000;
    } else if (item.dataset.boost === 'multitap') {
        cost = baseCost + (level - 1) * 500;
    }
    if (balance >= cost) {
        balance -= cost;
        item.querySelector('.boost-level').innerText = `${level} lvl`;

        if (item.dataset.boost === 'energy-limit') {
            maxEnergy += 500;
            upgradeLevel += 1;
        } else if (item.dataset.boost === 'energy-recharge-speed') {
            energyRechargeRate += 1;
            rechargeLevel += 1;
        } else if (item.dataset.boost === 'multitap') {
            tapMultiplier += 1;
            tapLevel += 1;
        }

        updateBoostCost();
        updateDisplay();
        showMessage(`${item.querySelector('.boost-name').innerText} (Level ${level}) активовано!`);
        saveDataToFirebase();
    } else {
        showInsufficientFundsModal();
    }
}

document.querySelectorAll('.boost-item').forEach((item) => {
    item.addEventListener('click', () => {
        if (item.classList.contains('disabled')) {
            showMessage('Цей буст вже на максимальному рівні.');
        } else {
            showConfirmModal(item);
        }
    });
});

document.getElementById('coin').addEventListener('click', () => {
    if (energy >= tapMultiplier) {
        balance += tapMultiplier;
        energy -= tapMultiplier;
        updateDisplay();
        saveDataToFirebase();
    } else {
        showMessage('Немає достатньо енергії для цього кліку!');
    }
});

// Оновлюємо енергію кожну секунду
setInterval(() => {
    if (energy < maxEnergy) {
        energy += energyRechargeRate;
        if (energy > maxEnergy) {
            energy = maxEnergy;
        }
        updateDisplay();
        saveDataToFirebase();
    }
}, 1000);

// Оновлюємо енергію при поверненні на сторінку
window.addEventListener('focus', updateEnergyInBackground);

// Оновлюємо енергію при розфокусуванні (наприклад, коли користувач переходить на іншу вкладку)
window.addEventListener('blur', () => {
    lastUpdateTime = Date.now(); // Оновлюємо час останнього оновлення
    saveDataToFirebase(); // Зберігаємо час останнього оновлення у Firebase
});

document.getElementById('boosts-btn').addEventListener('click', () => {
    document.getElementById('boostsModal').style.display = 'block';
});

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('boostsModal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('boostsModal')) {
        document.getElementById('boostsModal').style.display = 'none';
    }
});

document.getElementById('frens-btn').addEventListener('click', () => {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('frens-screen').style.display = 'block';
});

document.querySelector('.back-btn').addEventListener('click', () => {
    document.getElementById('frens-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
});

document.getElementById('get-id-btn').addEventListener('click', function() {
    const tg = window.Telegram.WebApp;
    const user = tg.initDataUnsafe.user;
    if (user) {
        document.getElementById('result').innerText = `Ваш Telegram ID: ${user.id}`;
    } else {
        document.getElementById('result').innerText = 'Не вдалося отримати ваш Telegram ID.';
    }
});

window.onload = function() {
    getTelegramUserId();
    loadDataFromFirebase();
};