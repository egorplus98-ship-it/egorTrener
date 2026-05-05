import { auth, db, syncToCloud, loadFromCloud, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-sync.js';
import { 
    trainingHistory, customExercises, bodyWeightHistory, nextId, 
    initCurrentWorkout, getOrderedWorkoutExercises, currentWorkout 
} from './training-logic.js';
import { formatDateToDMY, getToday, parseCalories } from './utils.js';
import { 
    renderExerciseManageList, renderExercises, renderHistory, 
    updateWeightHistoryList, setupOrderModal 
} from './render.js';
import { Charts } from './charts.js';

// Глобальные переменные
let currentUser = null;
const charts = new Charts();

// Инициализация приложения
function initApp() {
    initCurrentWorkout();
    renderExerciseManageList();
    renderExercises();
    renderHistory();
    updateWeightHistoryList();
    setupOrderModal();
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('workoutDate').value = today;
    
    setupEventListeners();
}

// Все обработчики событий
function setupEventListeners() {
    // Вход
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            await loadUserData();
        } catch(error) {
            alert('Ошибка входа: ' + error.message);
        }
    });

    // Выход
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        currentUser = null;
        document.getElementById('login-page').classList.add('active-page');
        document.getElementById('app-page').classList.remove('active-page');
        document.getElementById('mainTabs').style.display = 'none';
    });

    // Сохранение тренировки
    document.getElementById('saveAllWorkoutsBtn')?.addEventListener('click', async () => {
        const selectedDate = document.getElementById('workoutDate').value;
        if (!selectedDate) { 
            alert("Выберите дату"); 
            return; 
        }
        
        let savedCount = 0;
        for (let exercise of customExercises) {
            const sets = currentWorkout[exercise];
            if (sets && sets.length > 0) {
                trainingHistory.push({
                    id: nextId++,
                    date: selectedDate,
                    exercise: exercise,
                    sets: sets.map(s => ({ 
                        weight: s.weight, 
                        weightType: s.weightType || 'kg',
                        reps: s.reps, 
                        effort: s.effort 
                    })),
                    calories: null
                });
                savedCount++;
                currentWorkout[exercise] = [];
            }
        }
        
        const caloriesInput = document.getElementById('caloriesInput').value;
        const caloriesValue = parseCalories(caloriesInput);
        if (caloriesValue !== null && savedCount > 0) {
            trainingHistory[trainingHistory.length - 1].calories = caloriesValue;
        }
        
        if (savedCount > 0) {
            renderExercises();
            renderHistory();
            charts.updateProgressChart(trainingHistory, customExercises);
            charts.updateMaxChart(trainingHistory);
            charts.updateWeightChart(bodyWeightHistory);
            document.getElementById('caloriesInput').value = '';
            if (currentUser) await syncToCloud(currentUser.uid, {
                trainingHistory, customExercises, bodyWeightHistory, nextId
            });
            alert(`Сохранено ${savedCount} упражнений`);
        } else { 
            alert("Нет подходов"); 
        }
    });

    // Добавление упражнения через модальное окно
    document.getElementById('addExerciseFromModalBtn')?.addEventListener('click', async () => {
        const newEx = document.getElementById('newExerciseNameInput').value.trim();
        if (newEx && !customExercises.includes(newEx)) {
            customExercises.push(newEx);
            currentWorkout[newEx] = [];
            renderExerciseManageList();
            renderExercises();
            if (currentUser) await syncToCloud(currentUser.uid, {
                trainingHistory, customExercises, bodyWeightHistory, nextId
            });
            document.getElementById('newExerciseNameInput').value = '';
            alert(`Упражнение "${newEx}" добавлено`);
        } else if (newEx) { 
            alert('Такое упражнение уже есть'); 
        } else {
            alert('Введите название упражнения');
        }
    });

    // Добавление веса тела
    document.getElementById('addWeightBtn')?.addEventListener('click', async () => {
        const date = document.getElementById('weightDateInput').value;
        const weight = parseFloat(document.getElementById('weightValueInput').value);
        if (date && weight) {
            const existing = bodyWeightHistory.find(w => w.date === date);
            if (existing) existing.weight = weight;
            else bodyWeightHistory.push({ date, weight });
            updateWeightHistoryList();
            charts.updateWeightChart(bodyWeightHistory);
            if (currentUser) await syncToCloud(currentUser.uid, {
                trainingHistory, customExercises, bodyWeightHistory, nextId
            });
            document.getElementById('weightValueInput').value = '';
        } else {
            alert('Введите дату и вес');
        }
    });

    // Копирование JSON
    document.getElementById('copyJsonBtn')?.addEventListener('click', async () => {
        const profile = {
            height: document.getElementById('userHeight').value,
            weight: document.getElementById('userWeight').value,
            gender: document.getElementById('userGender').value,
            age: document.getElementById('userAge').value
        };
        const exportData = { profile, exercises: customExercises, bodyWeight: bodyWeightHistory, workouts: trainingHistory };
        try {
            await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            alert('JSON скопирован');
        } catch(err) {
            alert('Не удалось скопировать');
        }
    });

    // Рекомендация ИИ
    document.getElementById('smartAdviceBtn')?.addEventListener('click', () => {
        let last = {};
        trainingHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(w => {
            if (!last[w.exercise]) last[w.exercise] = w;
        });
        
        let text = 'Рекомендации\n';
        let hasData = false;
        
        for (let ex in last) {
            hasData = true;
            let w = last[ex];
            let lastSet = w.sets[w.sets.length - 1];
            let avgReps = w.sets.reduce((s, set) => s + set.reps, 0) / w.sets.length;
            const weightDisplay = lastSet.weightType === 'bw' ? 'Свой вес' : `${lastSet.weight} кг`;
            text += `\n${ex} (${formatDateToDMY(w.date)})\n`;
            text += `   Последний: ${weightDisplay} x ${lastSet.reps} (усилие ${lastSet.effort})\n`;
            if (avgReps >= 10) text += `   Добавь +2.5-5 кг, делай 6-8 повторов\n`;
            else if (avgReps >= 6) text += `   Можно добавить +2.5 кг или +1 повтор\n`;
            else text += `   Снизь вес на 5-10%, работай 8-12 повторов\n`;
        }
        
        if (!hasData) text = 'Нет данных. Добавьте тренировки';
        document.getElementById('adviceOutput').innerHTML = text;
    });

    // Синхронизация вручную
    document.getElementById('syncNowBtn')?.addEventListener('click', async () => {
        if (currentUser) {
            await syncToCloud(currentUser.uid, {
                trainingHistory, customExercises, bodyWeightHistory, nextId
            });
            alert('Синхронизация завершена');
        }
    });

    // Показать пикер упражнений
    window.showExercisePicker = function() {
        const pickerContainer = document.getElementById('exercisePickerList');
        pickerContainer.innerHTML = '';
        customExercises.forEach(exercise => {
            const hasSets = currentWorkout[exercise] && currentWorkout[exercise].length > 0;
            const div = document.createElement('div');
            div.className = 'exercise-picker-item';
            div.innerHTML = `<span>${exercise} ${hasSets ? 'есть' : ''}</span><button class="add-exercise-picker-btn" data-exercise="${exercise}">Добавить</button>`;
            pickerContainer.appendChild(div);
        });
        document.querySelectorAll('.add-exercise-picker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exercise = btn.dataset.exercise;
                if (!currentWorkout[exercise]) {
                    currentWorkout[exercise] = [];
                }
                if (currentWorkout[exercise].length === 0) {
                    currentWorkout[exercise].push({ weight: 60, weightType: 'kg', reps: 8, effort: 7 });
                }
                renderExercises();
                document.getElementById('exercisePickerModal').style.display = 'none';
            });
        });
        document.getElementById('exercisePickerModal').style.display = 'flex';
    };
    
    document.getElementById('showExercisePickerBtn')?.addEventListener('click', () => {
        window.showExercisePicker();
    });
    
    document.getElementById('closePickerBtn')?.addEventListener('click', () => {
        document.getElementById('exercisePickerModal').style.display = 'none';
    });

    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('#app-page .page').forEach(p => p.classList.remove('active-page'));
            const tabId = btn.dataset.tab;
            const targetPage = document.getElementById(`${tabId}-page`);
            if (targetPage) targetPage.classList.add('active-page');
            if (tabId === 'history') renderHistory();
            if (tabId === 'stats') {
                charts.updateProgressChart(trainingHistory, customExercises);
                charts.updateMaxChart(trainingHistory);
                charts.updateWeightChart(bodyWeightHistory);
            }
        });
    });

    // Переключение вкладок графиков
    document.querySelectorAll('.chart-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const chartType = btn.dataset.chart;
            document.querySelectorAll('.chart-container').forEach(container => container.classList.remove('active'));
            if (chartType === 'progress') {
                document.getElementById('progress-chart-container').classList.add('active');
                charts.updateProgressChart(trainingHistory, customExercises);
            } else {
                document.getElementById('max-chart-container').classList.add('active');
                charts.updateMaxChart(trainingHistory);
            }
        });
    });

    // Модальные окна
    const profileModal = document.getElementById('profileModal');
    const exercisePickerModal = document.getElementById('exercisePickerModal');
    const orderModal = document.getElementById('orderModal');

    document.getElementById('profileIcon')?.addEventListener('click', () => { 
        profileModal.style.display = 'flex'; 
    });
    document.getElementById('closeProfileBtn')?.addEventListener('click', () => { 
        profileModal.style.display = 'none'; 
    });
    profileModal?.addEventListener('click', (e) => { 
        if (e.target === profileModal) profileModal.style.display = 'none'; 
    });
    exercisePickerModal?.addEventListener('click', (e) => { 
        if (e.target === exercisePickerModal) exercisePickerModal.style.display = 'none'; 
    });
    orderModal?.addEventListener('click', (e) => { 
        if (e.target === orderModal) orderModal.style.display = 'none'; 
    });

    // Анимация бицепса
    const bicepIcon = document.getElementById('bicepIcon');
    bicepIcon?.addEventListener('click', () => {
        bicepIcon.style.animation = 'none';
        setTimeout(() => bicepIcon.style.animation = 'flexBicep 1s ease infinite', 10);
    });
}

// Загрузка данных пользователя из облака
async function loadUserData() {
    const data = await loadFromCloud(currentUser.uid);
    if (data) {
        // Очищаем массивы через length = 0, чтобы сохранить ссылки
        trainingHistory.length = 0;
        trainingHistory.push(...(data.trainingHistory || []));
        
        customExercises.length = 0;
        customExercises.push(...(data.customExercises || ["Жим лёжа", "Присед", "Становая тяга", "Тяга штанги", "Жим стоя"]));
        
        bodyWeightHistory.length = 0;
        bodyWeightHistory.push(...(data.bodyWeightHistory || []));
        
        nextId = data.nextId || 1;
    }
    initCurrentWorkout();
    renderExerciseManageList();
    renderExercises();
    renderHistory();
    updateWeightHistoryList();
    charts.updateProgressChart(trainingHistory, customExercises);
    charts.updateMaxChart(trainingHistory);
    charts.updateWeightChart(bodyWeightHistory);
    document.getElementById('userEmail').innerText = currentUser.email;
    document.getElementById('login-page').classList.remove('active-page');
    document.getElementById('app-page').classList.add('active-page');
    document.getElementById('mainTabs').style.display = 'flex';
    document.getElementById('workoutDate').value = getToday();
}

// Подписка на изменение состояния авторизации
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
    } else {
        currentUser = null;
        document.getElementById('login-page').classList.add('active-page');
        document.getElementById('app-page').classList.remove('active-page');
        document.getElementById('mainTabs').style.display = 'none';
    }
});

// Запуск приложения
initApp();
