'use strict';

// ===== Хранение данных =====

// Ключ, под которым состояние приложения лежит в localStorage
const STORAGE_KEY = 'workout-tracker:v1';

// Сколько миллисекунд сообщение остаётся на экране
const MESSAGE_TIMEOUT = 4000;

// Текущее состояние приложения. Структура: workouts -> exercises -> sets
let state = createEmptyState();

// Таймер, который скрывает сообщение
let messageTimer = null;

function createEmptyState() {
    return { workouts: [], activeWorkoutId: null };
}

// Проверяет структуру данных после чтения и перед сохранением
function isValidState(data) {
    if (data === null || typeof data !== 'object' || !Array.isArray(data.workouts)) {
        return false;
    }
    return data.workouts.every(function (workout) {
        return workout !== null
            && typeof workout === 'object'
            && typeof workout.id === 'string'
            && typeof workout.name === 'string'
            && typeof workout.date === 'string'
            && Array.isArray(workout.exercises)
            && workout.exercises.every(function (exercise) {
                return exercise !== null
                    && typeof exercise === 'object'
                    && Array.isArray(exercise.sets);
            });
    });
}

// Читает состояние из localStorage.
// При любой ошибке приложение не падает, а стартует с пустым состоянием
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return createEmptyState();
        }
        const data = JSON.parse(raw);
        if (!isValidState(data)) {
            throw new Error('Неверная структура данных');
        }
        // Активная тренировка должна существовать в списке
        const hasActive = data.workouts.some(function (workout) {
            return workout.id === data.activeWorkoutId;
        });
        if (!hasActive) {
            data.activeWorkoutId = null;
        }
        return data;
    } catch (error) {
        showMessage('Не удалось прочитать сохранённые данные. Приложение запущено с пустым списком.', 'error');
        return createEmptyState();
    }
}

// Сохраняет состояние. Вызывается сразу после каждого изменения данных
function saveState() {
    if (!isValidState(state)) {
        showMessage('Данные не сохранены: неверная структура.', 'error');
        return false;
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        showMessage('Не удалось сохранить данные в браузере.', 'error');
        return false;
    }
    renderStorageStatus();
    return true;
}

// Показывает сообщение пользователю. type: 'success' или 'error'
function showMessage(text, type) {
    const box = document.getElementById('message');
    box.textContent = text;
    box.className = 'message message-' + type;
    box.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () {
        box.hidden = true;
    }, MESSAGE_TIMEOUT);
}

// Показывает в подвале страницы, сколько тренировок сохранено
function renderStorageStatus() {
    const status = document.getElementById('storageStatus');
    status.textContent = 'Сохранено тренировок: ' + state.workouts.length
        + '. Данные хранятся в этом браузере.';
}

// ===== Запуск приложения =====

function init() {
    state = loadState();
    renderStorageStatus();
}

document.addEventListener('DOMContentLoaded', init);
