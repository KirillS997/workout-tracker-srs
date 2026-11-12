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

// ===== Справочник упражнений =====

const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Пресс'];

const EXERCISE_CATALOG = [
    { id: 'bench-press', name: 'Жим штанги лёжа', muscleGroup: 'Грудь' },
    { id: 'incline-dumbbell-press', name: 'Жим гантелей на наклонной скамье', muscleGroup: 'Грудь' },
    { id: 'dips', name: 'Отжимания на брусьях', muscleGroup: 'Грудь' },
    { id: 'cable-crossover', name: 'Сведение рук в кроссовере', muscleGroup: 'Грудь' },
    { id: 'pull-ups', name: 'Подтягивания', muscleGroup: 'Спина' },
    { id: 'barbell-row', name: 'Тяга штанги в наклоне', muscleGroup: 'Спина' },
    { id: 'lat-pulldown', name: 'Тяга верхнего блока', muscleGroup: 'Спина' },
    { id: 'deadlift', name: 'Становая тяга', muscleGroup: 'Спина' },
    { id: 'squat', name: 'Приседания со штангой', muscleGroup: 'Ноги' },
    { id: 'leg-press', name: 'Жим ногами', muscleGroup: 'Ноги' },
    { id: 'lunges', name: 'Выпады с гантелями', muscleGroup: 'Ноги' },
    { id: 'romanian-deadlift', name: 'Румынская тяга', muscleGroup: 'Ноги' },
    { id: 'overhead-press', name: 'Жим штанги стоя', muscleGroup: 'Плечи' },
    { id: 'lateral-raise', name: 'Махи гантелями в стороны', muscleGroup: 'Плечи' },
    { id: 'upright-row', name: 'Тяга штанги к подбородку', muscleGroup: 'Плечи' },
    { id: 'barbell-curl', name: 'Подъём штанги на бицепс', muscleGroup: 'Руки' },
    { id: 'hammer-curl', name: 'Молотки с гантелями', muscleGroup: 'Руки' },
    { id: 'french-press', name: 'Французский жим', muscleGroup: 'Руки' },
    { id: 'triceps-pushdown', name: 'Разгибание рук на блоке', muscleGroup: 'Руки' },
    { id: 'crunches', name: 'Скручивания', muscleGroup: 'Пресс' },
    { id: 'hanging-leg-raise', name: 'Подъём ног в висе', muscleGroup: 'Пресс' },
    { id: 'plank', name: 'Планка', muscleGroup: 'Пресс' }
];

// Выводит справочник на страницу: упражнения сгруппированы по мышцам
function renderCatalog() {
    const container = document.getElementById('exerciseCatalog');
    container.textContent = '';

    MUSCLE_GROUPS.forEach(function (group) {
        const exercises = EXERCISE_CATALOG.filter(function (exercise) {
            return exercise.muscleGroup === group;
        });

        const block = document.createElement('div');
        block.className = 'catalog-group';

        const title = document.createElement('h3');
        title.textContent = group + ' (' + exercises.length + ')';
        block.appendChild(title);

        const list = document.createElement('ul');
        exercises.forEach(function (exercise) {
            const item = document.createElement('li');
            item.textContent = exercise.name;
            list.appendChild(item);
        });
        block.appendChild(list);

        container.appendChild(block);
    });
}

// ===== Запуск приложения =====

function init() {
    state = loadState();
    renderStorageStatus();
    renderCatalog();
}

document.addEventListener('DOMContentLoaded', init);
