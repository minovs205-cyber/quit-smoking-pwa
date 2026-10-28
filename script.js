// ============================================
// РЕГИСТРАЦИЯ SERVICE WORKER
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('SW зарегистрирован:', registration.scope);
            })
            .catch((error) => {
                console.log('SW регистрация не удалась:', error);
            });
    });
}

// ============================================
// БЕЗОПАСНОСТЬ: PIN-КОД
// ============================================
const APP_PIN_KEY = 'app_pin';
const isPinSet = localStorage.getItem(APP_PIN_KEY);

// Если PIN установлен — показываем экран блокировки
if (isPinSet) {
    document.getElementById('pin-screen').style.display = 'flex';
    document.querySelector('.container').style.display = 'none';
}

function checkPin() {
    const input = document.getElementById('pin-input').value;
    if (input === localStorage.getItem(APP_PIN_KEY)) {
        document.getElementById('pin-screen').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-error').style.display = 'none';
    } else {
        document.getElementById('pin-error').style.display = 'block';
        document.getElementById('pin-input').value = '';
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

function forgotPin() {
    if (confirm('ВНИМАНИЕ: Это полностью удалит все ваши данные (профиль, календарь, настройки). Продолжить?')) {
        localStorage.clear();
        location.reload();
    }
}

function setNewPin(newPin) {
    if (newPin.length === 4 && /^\d+$/.test(newPin)) {
        localStorage.setItem(APP_PIN_KEY, newPin);
        alert('PIN-код успешно установлен!');
    } else {
        alert('PIN-код должен состоять из 4 цифр.');
    }
}

function setNewPinFromForm() {
    const pinInput = document.getElementById('new-pin');
    const pin = pinInput.value;
    setNewPin(pin);
    pinInput.value = '';
}

// ============================================
// БЕЗОПАСНОСТЬ: ЭКСПОРТ / ИМПОРТ ДАННЫХ
// ============================================
function exportData() {
    const data = {
        profile: localStorage.getItem('profile'),
        relapses: localStorage.getItem('relapses'),
        app_pin: localStorage.getItem('app_pin'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quit-smoking-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.profile) localStorage.setItem('profile', data.profile);
            if (data.relapses) localStorage.setItem('relapses', data.relapses);
            if (data.app_pin) localStorage.setItem('app_pin', data.app_pin);
            
            alert('Данные успешно восстановлены!');
            location.reload();
        } catch (err) {
            alert('Ошибка: неверный формат файла резервной копии.');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// ============================================
// ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ
// ============================================
let currentMonth = new Date();
let sosInterval;
let breathingInterval;

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    updateStats();
    renderCalendar();
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'calendar-screen') {
        renderCalendar();
    }
}

// Сохранение профиля
document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const profile = {
        name: document.getElementById('user-name').value,
        gender: document.getElementById('user-gender').value,
        age: document.getElementById('user-age').value,
        quitDate: document.getElementById('quit-date').value,
        cigarettesPerDay: document.getElementById('cigarettes-per-day').value,
        packPrice: document.getElementById('pack-price').value,
        cigarettesPerPack: document.getElementById('cigarettes-per-pack').value,
        savingsGoal: document.getElementById('savings-goal').value
    };
    
    localStorage.setItem('profile', JSON.stringify(profile));
    updateGreeting();
    updateStats();
    showScreen('main-screen');
    alert('Профиль сохранен!');
});

function loadProfile() {
    const profile = JSON.parse(localStorage.getItem('profile'));
    if (profile) {
        document.getElementById('user-name').value = profile.name || '';
        document.getElementById('user-gender').value = profile.gender || 'male';
        document.getElementById('user-age').value = profile.age || '';
        document.getElementById('quit-date').value = profile.quitDate || '';
        document.getElementById('cigarettes-per-day').value = profile.cigarettesPerDay || '';
        document.getElementById('pack-price').value = profile.packPrice || '';
        document.getElementById('cigarettes-per-pack').value = profile.cigarettesPerPack || '20';
        document.getElementById('savings-goal').value = profile.savingsGoal || '';
        updateGreeting();
    }
}

function updateGreeting() {
    const profile = JSON.parse(localStorage.getItem('profile'));
    if (profile && profile.name) {
        document.getElementById('greeting').textContent = `Привет, ${profile.name}!`;
    }
}

function updateStats() {
    const profile = JSON.parse(localStorage.getItem('profile'));
    if (!profile || !profile.quitDate) return;
    
    const quitDate = new Date(profile.quitDate);
    const today = new Date();
    const diffTime = today - quitDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    document.getElementById('days-clean').textContent = diffDays;
    
    const pricePerCigarette = profile.packPrice / profile.cigarettesPerPack;
    const cigarettesNotSmoked = diffDays * profile.cigarettesPerDay;
    const moneySaved = Math.round(cigarettesNotSmoked * pricePerCigarette);
    
    document.getElementById('money-saved').textContent = `${moneySaved.toLocaleString('ru-RU')} ₽`;
    document.getElementById('cigarettes-not-smoked').textContent = cigarettesNotSmoked;
    
    updateHealthTimeline(diffDays);
}

function updateHealthTimeline(days) {
    const milestones = [
        { time: '20 минут', days: 0, text: 'Нормализуется давление и пульс' },
        { time: '8 часов', days: 1, text: 'Уровень угарного газа в крови падает до нормы' },
        { time: '24 часа', days: 1, text: 'Риск инфаркта начинает снижаться' },
        { time: '48 часов', days: 2, text: 'Восстанавливаются нервные окончания, улучшаются вкус и запах' },
        { time: '72 часа', days: 3, text: 'Бронхи расслабляются, дыхание становится легче' },
        { time: '2 недели', days: 14, text: 'Улучшается функция легких, ходьба становится легче' },
        { time: '1 месяц', days: 30, text: 'Уменьшается кашель и одышка' },
        { time: '3 месяца', days: 90, text: 'Улучшается кровообращение' },
        { time: '9 месяцев', days: 270, text: 'Значительно снижается риск инфекций легких' },
        { time: '1 год', days: 365, text: 'Риск ишемической болезни сердца снижается вдвое' },
        { time: '5 лет', days: 1825, text: 'Риск инсульта снижается до уровня некурящего' },
        { time: '10 лет', days: 3650, text: 'Риск рака легких снижается вдвое' }
    ];
    
    const container = document.getElementById('health-milestones');
    container.innerHTML = '';
    
    milestones.forEach(milestone => {
        const achieved = days >= milestone.days;
        const div = document.createElement('div');
        div.className = `milestone ${achieved ? 'achieved' : ''}`;
        div.innerHTML = `
            <div class="milestone-time">${achieved ? '✓' : '○'} ${milestone.time}</div>
            <div>${milestone.text}</div>
        `;
        container.appendChild(div);
    });
}

// Календарь
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const relapses = JSON.parse(localStorage.getItem('relapses') || '[]');
    const profile = JSON.parse(localStorage.getItem('profile'));
    const quitDate = profile ? new Date(profile.quitDate) : null;
    
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }
    
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = day;
        
        const currentDate = new Date(year, month, day);
        
        if (currentDate.toDateString() === today.toDateString()) {
            div.classList.add('today');
        }
        
        const relapse = relapses.find(r => new Date(r.date).toDateString() === currentDate.toDateString());
        if (relapse) {
            div.classList.add('relapse');
            div.title = `Срыв: ${relapse.count} сигарет\nТриггер: ${relapse.trigger}`;
        } else if (quitDate && currentDate >= quitDate && currentDate <= today) {
            div.classList.add('clean');
        }
        
        grid.appendChild(div);
    }
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

function logRelapse() {
    document.getElementById('relapse-modal').classList.add('active');
    document.getElementById('relapse-date').valueAsDate = new Date();
}

function closeRelapseModal() {
    document.getElementById('relapse-modal').classList.remove('active');
}

document.getElementById('relapse-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const relapse = {
        date: document.getElementById('relapse-date').value,
        count: document.getElementById('relapse-count').value,
        trigger: document.getElementById('relapse-trigger').value
    };
    
    const relapses = JSON.parse(localStorage.getItem('relapses') || '[]');
    relapses.push(relapse);
    localStorage.setItem('relapses', JSON.stringify(relapses));
    
    closeRelapseModal();
    renderCalendar();
    alert('Запись сохранена. Помни: срыв — это не конец пути, а урок!');
});

// SOS функция
function showSOS() {
    document.getElementById('sos-modal').classList.add('active');
    startBreathingExercise();
    startSOSTimer();
}

function closeSOS() {
    document.getElementById('sos-modal').classList.remove('active');
    clearInterval(sosInterval);
    clearInterval(breathingInterval);
}

function startBreathingExercise() {
    const phases = ['Вдох...', 'Задержка...', 'Выдох...', 'Задержка...'];
    let phase = 0;
    
    breathingInterval = setInterval(() => {
        document.getElementById('breathing-text').textContent = phases[phase];
        phase = (phase + 1) % phases.length;
    }, 3000);
}

function startSOSTimer() {
    let seconds = 180;
    updateTimerDisplay(seconds);
    
    sosInterval = setInterval(() => {
        seconds--;
        updateTimerDisplay(seconds);
        
        if (seconds <= 0) {
            clearInterval(sosInterval);
            alert('Отличная работа! Ты справился с тягой! 💪');
            closeSOS();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('sos-timer').textContent = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}