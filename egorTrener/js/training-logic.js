// Основные данные
export let trainingHistory = [];
export let customExercises = ["Жим лёжа", "Присед", "Становая тяга", "Тяга штанги", "Жим стоя"];
export let currentWorkout = {};
export let bodyWeightHistory = [];
export let nextId = 1;

export function initCurrentWorkout() {
    currentWorkout = {};
    customExercises.forEach(ex => {
        currentWorkout[ex] = [];
    });
}

export function getOrderedWorkoutExercises() {
    return customExercises.filter(ex => currentWorkout[ex] && currentWorkout[ex].length > 0);
}