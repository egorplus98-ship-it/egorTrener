import { trainingHistory, customExercises, currentWorkout, bodyWeightHistory, nextId, getOrderedWorkoutExercises } from './training-logic.js';
import { formatDateToDMY, generateRepOptions, generateEffortOptions } from './utils.js';
import { syncToCloud } from './firebase-sync.js';

let currentOrderExercise = null;

export function renderExerciseManageList() {
    const container = document.getElementById('exerciseManageList');
    if (!container) return;
    container.innerHTML = '';
    customExercises.forEach((ex) => {
        const div = document.createElement('div');
        div.className = 'exercise-item';
        div.innerHTML = `<span>${ex}</span><button class="delete-exercise-btn" data-ex="${ex}">✕</button>`;
        container.appendChild(div);
    });
    document.querySelectorAll('#exerciseManageList .delete-exercise-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ex = btn.dataset.ex;
            if (confirm(`Удалить "${ex}"?`)) {
                const index = customExercises.indexOf(ex);
                if (index !== -1) customExercises.splice(index, 1);
                delete currentWorkout[ex];
                renderExerciseManageList();
                renderExercises();
                if (window.currentUser) await syncToCloud(window.currentUser.uid, {
                    trainingHistory, customExercises, bodyWeightHistory, nextId
                });
            }
        });
    });
}

export function renderExercises() {
    const container = document.getElementById('exercisesContainer');
    if (!container) return;
    container.innerHTML = '';

    const workoutExercises = getOrderedWorkoutExercises();

    workoutExercises.forEach((exercise, idx) => {
        const sets = currentWorkout[exercise] || [];
        const block = document.createElement('div');
        block.className = 'exercise-block';
        block.setAttribute('data-exercise', exercise);

        block.innerHTML = `
            <div class="exercise-header">
                <div style="display: flex; align-items: center;">
                    <div class="order-number" data-exercise="${exercise}">${idx + 1}</div>
                    <div class="exercise-title">${exercise}</div>
                </div>
                <button class="remove-exercise-btn" data-exercise="${exercise}">🗑</button>
            </div>
            <div class="exercise-sets">
                <div class="set-header">
                    <span>№</span><span>Вес</span><span>Повт</span><span>Усил</span><span></span>
                </div>
                ${sets.map((set, setIdx) => `
                    <div class="set-row">
                        <span class="set-label">${setIdx + 1}</span>
                        <input type="number" class="set-input" data-ex="${exercise}" data-idx="${setIdx}" data-field="weight" value="${set.weight}" step="2.5" placeholder="кг">
                        <select class="set-input" data-ex="${exercise}" data-idx="${setIdx}" data-field="reps">
                            ${generateRepOptions(set.reps)}
                        </select>
                        <select class="set-input" data-ex="${exercise}" data-idx="${setIdx}" data-field="effort">
                            ${generateEffortOptions(set.effort)}
                        </select>
                        <button class="delete-set-btn" data-ex="${exercise}" data-idx="${setIdx}">✕</button>
                    </div>
                `).join('')}
                <button class="add-set-btn secondary" data-exercise="${exercise}">+ Подход</button>
            </div>
        `;
        container.appendChild(block);
    });

    if (workoutExercises.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#6a6f87;">Нет упражнений. Нажмите «➕ Упр.» чтобы добавить</div>';
    }

    document.querySelectorAll('.order-number').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.stopPropagation();
            const exercise = elem.dataset.exercise;
            currentOrderExercise = exercise;
            document.getElementById('orderExerciseName').innerText = `Упражнение: ${exercise}`;
            document.getElementById('orderNumberInput').value = '';
            document.getElementById('orderModal').style.display = 'flex';
        });
    });

    document.querySelectorAll('.add-set-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const exercise = btn.dataset.exercise;
            if (!currentWorkout[exercise]) currentWorkout[exercise] = [];
            currentWorkout[exercise].push({ weight: 60, reps: 8, effort: 7 });
            renderExercises();
        });
    });

    document.querySelectorAll('.set-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const exercise = inp.dataset.ex;
            const idx = parseInt(inp.dataset.idx);
            const field = inp.dataset.field;
            if (currentWorkout[exercise] && currentWorkout[exercise][idx]) {
                let value = inp.value;
                if (field === 'reps' || field === 'effort') value = parseInt(value);
                else if (field === 'weight') value = parseFloat(value);
                currentWorkout[exercise][idx][field] = value;
            }
        });
    });

    document.querySelectorAll('.delete-set-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const exercise = btn.dataset.ex;
            const idx = parseInt(btn.dataset.idx);
            if (currentWorkout[exercise]) {
                currentWorkout[exercise].splice(idx, 1);
                renderExercises();
            }
        });
    });

    document.querySelectorAll('.remove-exercise-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const exercise = btn.dataset.exercise;
            if (currentWorkout[exercise]) {
                currentWorkout[exercise] = [];
                renderExercises();
            }
        });
    });
}

export function setupOrderModal() {
    document.getElementById('confirmOrderBtn')?.addEventListener('click', () => {
        const newPosition = parseInt(document.getElementById('orderNumberInput').value);
        if (!currentOrderExercise || isNaN(newPosition)) {
            alert('Введите номер');
            return;
        }

        const currentExercises = getOrderedWorkoutExercises();
        const oldIndex = currentExercises.indexOf(currentOrderExercise);
        if (oldIndex === -1) {
            document.getElementById('orderModal').style.display = 'none';
            return;
        }

        const newIndex = newPosition - 1;
        if (newIndex < 0 || newIndex >= currentExercises.length) {
            alert(`Введите число от 1 до ${currentExercises.length}`);
            return;
        }

        if (oldIndex !== newIndex) {
            const moved = currentExercises[oldIndex];
            currentExercises.splice(oldIndex, 1);
            currentExercises.splice(newIndex, 0, moved);

            const newWorkout = {};
            for (let ex of currentExercises) newWorkout[ex] = currentWorkout[ex];
            for (let ex of customExercises) if (!newWorkout[ex]) newWorkout[ex] = [];
            Object.assign(currentWorkout, newWorkout);
            renderExercises();
        }
        document.getElementById('orderModal').style.display = 'none';
        currentOrderExercise = null;
    });

    document.getElementById('closeOrderBtn')?.addEventListener('click', () => {
        document.getElementById('orderModal').style.display = 'none';
    });
}

export function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    if (trainingHistory.length === 0) {
        container.innerHTML = '<div class="card">Нет записей</div>';
        return;
    }
    const grouped = {};
    trainingHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
    });
    container.innerHTML = '';
    for (let date in grouped) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'history-day';
        let caloriesTotal = 0;
        grouped[date].forEach(ex => { if (ex.calories) caloriesTotal += ex.calories; });
        dayDiv.innerHTML = `
            <div class="history-day-header">
                <span>📅 ${formatDateToDMY(date)} ${caloriesTotal ? `🔥 ${caloriesTotal} ккал` : ''}</span>
                <button class="delete-day-btn" data-date="${date}">🗑 День</button>
            </div>
            <div id="day-${date.replace(/-/g, '')}"></div>
        `;
        container.appendChild(dayDiv);
        const dayContainer = dayDiv.querySelector(`#day-${date.replace(/-/g, '')}`);
        grouped[date].forEach(entry => {
            const exDiv = document.createElement('div');
            exDiv.className = 'history-exercise';
            let setsHtml = '<div class="history-sets-list">';
            entry.sets.forEach(set => {
                setsHtml += `<div class="history-set-item">▪️ ${set.weight} кг × ${set.reps} (💪${set.effort}/10)</div>`;
            });
            setsHtml += '</div>';
            exDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${entry.exercise}</strong>
                    <button class="delete-exercise-btn-hist" data-id="${entry.id}">🗑</button>
                </div>
                ${setsHtml}
            `;
            dayContainer.appendChild(exDiv);
        });
    }
    document.querySelectorAll('.delete-day-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const date = btn.dataset.date;
            if (confirm(`Удалить всё за ${formatDateToDMY(date)}?`)) {
                const newHistory = trainingHistory.filter(e => e.date !== date);
                trainingHistory.length = 0;
                trainingHistory.push(...newHistory);
                renderHistory();
                if (window.currentUser) await syncToCloud(window.currentUser.uid, {
                    trainingHistory, customExercises, bodyWeightHistory, nextId
                });
            }
        });
    });
    document.querySelectorAll('.delete-exercise-btn-hist').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            if (confirm('Удалить это упражнение из истории?')) {
                const index = trainingHistory.findIndex(e => e.id === id);
                if (index !== -1) trainingHistory.splice(index, 1);
                renderHistory();
                if (window.currentUser) await syncToCloud(window.currentUser.uid, {
                    trainingHistory, customExercises, bodyWeightHistory, nextId
                });
            }
        });
    });
}

export function updateWeightHistoryList() {
    const container = document.getElementById('weightHistoryList');
    if (!container) return;
    container.innerHTML = '';
    [...bodyWeightHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(w => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #2a2f40;';
        d.innerHTML = `<span>${formatDateToDMY(w.date)}</span><span>${w.weight} кг</span><button class="delete-weight-btn" data-date="${w.date}" style="background:#ff5c5c; padding:2px 8px; width:auto;">✕</button>`;
        container.appendChild(d);
    });
    document.querySelectorAll('.delete-weight-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const date = btn.dataset.date;
            const index = bodyWeightHistory.findIndex(w => w.date === date);
            if (index !== -1) bodyWeightHistory.splice(index, 1);
            updateWeightHistoryList();
            if (window.currentUser) await syncToCloud(window.currentUser.uid, {
                trainingHistory, customExercises, bodyWeightHistory, nextId
            });
        });
    });
}