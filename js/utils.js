// Форматирование дат
export function formatDateToDMY(dateStr) {
    if (!dateStr) return "";
    let parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateStr;
}

export function formatDateToYMD(dateStr) {
    if (!dateStr) return "";
    let parts = dateStr.split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateStr;
}

export function getToday() {
    return new Date().toISOString().slice(0, 10);
}

// Парсинг калорий (поддерживает сумму: 1000+200)
export function parseCalories(input) {
    if (!input || input.trim() === "") return null;
    let str = input.toString().trim();
    if (str.includes('+')) {
        let parts = str.split('+');
        let total = 0;
        for (let p of parts) {
            let num = parseFloat(p);
            if (!isNaN(num)) total += num;
        }
        return total;
    }
    let num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// Расчёт 1ПМ
export function calculate1RM(weight, reps, effort) {
    let raw = weight * (1 + reps / 30);
    let mult = 0.7 + (effort / 10) * 0.3;
    return Math.round(raw * mult);
}

// Генерация опций для выпадающего списка (от 1 до 100)
export function generateRepOptions(selectedReps = 8) {
    let options = '';
    for (let i = 1; i <= 100; i++) {
        options += `<option value="${i}" ${selectedReps == i ? 'selected' : ''}>${i}</option>`;
    }
    return options;
}

// Генерация опций для усилий (1-10)
export function generateEffortOptions(selectedEffort = 7) {
    let options = '';
    for (let i = 1; i <= 10; i++) {
        options += `<option value="${i}" ${selectedEffort == i ? 'selected' : ''}>${i} ${i >= 8 ? '🔥' : i <= 3 ? '💀' : '💪'}</option>`;
    }
    return options;
}