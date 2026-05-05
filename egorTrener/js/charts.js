import { calculate1RM, formatDateToDMY } from './utils.js';

export class Charts {
    constructor() {
        this.chart1 = null;
        this.chart2 = null;
        this.chart3 = null;
    }

    updateProgressChart(trainingHistory, customExercises) {
        const select = document.getElementById('chartExerciseSelect');
        if (!select) return;

        select.innerHTML = '';
        customExercises.forEach(ex => {
            let o = document.createElement('option');
            o.value = ex;
            o.textContent = ex;
            select.appendChild(o);
        });

        const exercise = select.value;
        if (exercise && trainingHistory.length > 0) {
            const filtered = trainingHistory.filter(e => e.exercise === exercise).sort((a, b) => new Date(a.date) - new Date(b.date));
            const labels = filtered.map(e => formatDateToDMY(e.date));
            const data = filtered.map(e => Math.max(...e.sets.map(s => calculate1RM(s.weight, s.reps, s.effort))));
            const ctx = document.getElementById('progressChart')?.getContext('2d');
            if (ctx) {
                if (this.chart1) this.chart1.destroy();
                if (labels.length > 0) {
                    this.chart1 = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: `1ПМ ${exercise}`,
                                data: data,
                                borderColor: '#ff7b2c',
                                backgroundColor: 'rgba(255,123,44,0.1)',
                                fill: true,
                                tension: 0.2,
                                pointBackgroundColor: '#ff7b2c',
                                pointBorderColor: '#0a0c12',
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: (context) => `1ПМ: ${context.raw} кг`
                                    }
                                }
                            },
                            scales: {
                                y: { title: { display: true, text: '1ПМ (кг)', color: '#9ba1bc' }, grid: { color: '#2a2f40' }, ticks: { color: '#eef2ff' } },
                                x: { ticks: { color: '#eef2ff', maxRotation: 45, minRotation: 45, font: { size: 11 } } }
                            }
                        }
                    });
                }
            }
        }
    }

    updateMaxChart(trainingHistory) {
        const ctx = document.getElementById('maxChart')?.getContext('2d');
        if (!ctx) return;

        const lastSetByExercise = {};
        trainingHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(entry => {
            if (!lastSetByExercise[entry.exercise] && entry.sets && entry.sets.length > 0) {
                const lastSet = entry.sets[entry.sets.length - 1];
                lastSetByExercise[entry.exercise] = {
                    date: formatDateToDMY(entry.date),
                    weight: lastSet.weight,
                    weightType: lastSet.weightType,
                    reps: lastSet.reps,
                    value: lastSet.weight,
                    effort: lastSet.effort
                };
            }
        });

        const exercises = Object.keys(lastSetByExercise);
        const values = exercises.map(ex => lastSetByExercise[ex].value);

        if (this.chart3) this.chart3.destroy();
        if (exercises.length > 0) {
            this.chart3 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: exercises,
                    datasets: [{
                        label: 'Вес (кг)',
                        data: values,
                        backgroundColor: '#ff7b2c',
                        borderColor: '#ff9f5c',
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const ex = exercises[context.dataIndex];
                                    const data = lastSetByExercise[ex];
                                    const weightDisplay = data.weightType === 'bw' ? 'Свой вес' : `${data.weight} кг`;
                                    return [`Вес: ${weightDisplay}`, `Повторы: ${data.reps}`, `Усилие: ${data.effort}/10`, `Дата: ${data.date}`];
                                }
                            }
                        },
                        legend: { labels: { color: '#eef2ff' } }
                    },
                    scales: {
                        y: { title: { display: true, text: 'Вес (кг)', color: '#9ba1bc' }, grid: { color: '#2a2f40' }, ticks: { color: '#eef2ff' } },
                        x: { ticks: { color: '#eef2ff', maxRotation: 45, minRotation: 45, font: { size: 11 } } }
                    }
                }
            });
        } else {
            ctx.fillStyle = '#1e2332';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#9ba1bc';
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Нет данных', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    }

    updateWeightChart(bodyWeightHistory) {
        const wSorted = [...bodyWeightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
        const wCtx = document.getElementById('weightChart')?.getContext('2d');
        if (wCtx) {
            if (this.chart2) this.chart2.destroy();
            if (wSorted.length > 0) {
                this.chart2 = new Chart(wCtx, {
                    type: 'line',
                    data: {
                        labels: wSorted.map(w => formatDateToDMY(w.date)),
                        datasets: [{
                            label: 'Вес тела (кг)',
                            data: wSorted.map(w => w.weight),
                            borderColor: '#4c9aff',
                            backgroundColor: 'rgba(76,154,255,0.1)',
                            fill: true,
                            tension: 0.2,
                            pointBackgroundColor: '#4c9aff',
                            pointBorderColor: '#0a0c12',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            y: { title: { display: true, text: 'Вес (кг)', color: '#9ba1bc' }, grid: { color: '#2a2f40' }, ticks: { color: '#eef2ff' } },
                            x: { ticks: { color: '#eef2ff', maxRotation: 45, minRotation: 45, font: { size: 11 } } }
                        }
                    }
                });
            } else {
                wCtx.fillStyle = '#1e2332';
                wCtx.fillRect(0, 0, wCtx.canvas.width, wCtx.canvas.height);
                wCtx.fillStyle = '#9ba1bc';
                wCtx.font = '12px system-ui';
                wCtx.textAlign = 'center';
                wCtx.fillText('Нет данных о весе', wCtx.canvas.width / 2, wCtx.canvas.height / 2);
            }
        }
    }
}