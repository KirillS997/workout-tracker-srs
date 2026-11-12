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

// ===== Тренировки =====

const NAME_MAX_LENGTH = 60;

// Идентификатор тренировки, которую сейчас редактируют (null — создаётся новая)
let editingWorkoutId = null;

// Сегодняшняя дата в формате ГГГГ-ММ-ДД
function todayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
}

// Превращает ГГГГ-ММ-ДД в ДД.ММ.ГГГГ для показа пользователю
function formatDate(isoDate) {
    const parts = isoDate.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function isValidDate(isoDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return false;
    }
    const date = new Date(isoDate + 'T00:00:00');
    // Несуществующая дата (например, 31 февраля) «перескакивает» на другой день
    return !Number.isNaN(date.getTime()) && date.getDate() === Number(isoDate.slice(8));
}

function createId() {
    return 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function findWorkout(id) {
    return state.workouts.find(function (workout) {
        return workout.id === id;
    }) || null;
}

// Возвращает текст ошибки или пустую строку, если данные в порядке
function validateWorkoutInput(name, date) {
    if (name === '') {
        return 'Введите название тренировки.';
    }
    if (name.length > NAME_MAX_LENGTH) {
        return 'Название должно быть не длиннее ' + NAME_MAX_LENGTH + ' символов.';
    }
    if (date === '') {
        return 'Укажите дату тренировки.';
    }
    if (!isValidDate(date)) {
        return 'Дата указана неверно.';
    }
    return '';
}

// Кнопка «Сохранить»: добавляет тренировку в план или сохраняет изменения
function handleSaveWorkout(event) {
    event.preventDefault();
    const name = document.getElementById('workoutName').value.trim();
    const date = document.getElementById('workoutDate').value;

    const error = validateWorkoutInput(name, date);
    if (error !== '') {
        showMessage(error, 'error');
        return;
    }

    const edited = editingWorkoutId === null ? null : findWorkout(editingWorkoutId);
    if (edited !== null) {
        edited.name = name;
        edited.date = date;
    } else {
        state.workouts.push({
            id: createId(),
            name: name,
            date: date,
            status: 'planned',
            planned: true,
            exercises: []
        });
    }

    if (saveState()) {
        showMessage(edited !== null ? 'Изменения сохранены.' : 'Тренировка добавлена в план.', 'success');
    }
    resetForm();
    renderWorkouts();
}

// Удаляет тренировку из плана после подтверждения
function deleteWorkout(id) {
    const workout = findWorkout(id);
    if (workout === null) {
        return;
    }
    if (!confirm('Удалить тренировку «' + workout.name + '»?')) {
        return;
    }
    state.workouts = state.workouts.filter(function (item) {
        return item.id !== id;
    });
    if (editingWorkoutId === id) {
        resetForm();
    }
    saveState();
    renderWorkouts();
}

// Переносит тренировку в форму для изменения названия и даты
function editWorkout(id) {
    const workout = findWorkout(id);
    if (workout === null) {
        return;
    }
    editingWorkoutId = id;
    document.getElementById('workoutName').value = workout.name;
    document.getElementById('workoutDate').value = workout.date;
    document.getElementById('saveWorkoutBtn').textContent = 'Сохранить изменения';
    document.getElementById('startWorkoutBtn').hidden = true;
    document.getElementById('cancelEditBtn').hidden = false;
    document.getElementById('workoutName').focus();
}

// Возвращает форму в исходное состояние
function resetForm() {
    editingWorkoutId = null;
    document.getElementById('workoutName').value = '';
    document.getElementById('workoutDate').value = todayIso();
    document.getElementById('saveWorkoutBtn').textContent = 'Сохранить';
    document.getElementById('startWorkoutBtn').hidden = false;
    document.getElementById('cancelEditBtn').hidden = true;
}

// Создаёт кнопку для строки списка
function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
}

// Выводит запланированные тренировки, отсортированные по дате
function renderWorkouts() {
    const list = document.getElementById('workoutList');
    list.textContent = '';

    const planned = state.workouts
        .filter(function (workout) {
            return workout.status === 'planned';
        })
        .sort(function (a, b) {
            return a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
        });

    planned.forEach(function (workout) {
        const item = document.createElement('li');

        const info = document.createElement('div');
        info.className = 'workout-info';
        const name = document.createElement('span');
        name.className = 'workout-name';
        name.textContent = workout.name;
        const date = document.createElement('span');
        date.className = 'workout-date';
        date.textContent = formatDate(workout.date);
        info.appendChild(name);
        info.appendChild(date);

        const actions = document.createElement('div');
        actions.className = 'workout-actions';
        actions.appendChild(createButton('Изменить', 'secondary', function () {
            editWorkout(workout.id);
        }));
        actions.appendChild(createButton('Удалить', 'danger', function () {
            deleteWorkout(workout.id);
        }));

        item.appendChild(info);
        item.appendChild(actions);
        list.appendChild(item);
    });

    document.getElementById('workoutListEmpty').hidden = planned.length > 0;
}

// ===== Запуск приложения =====

function init() {
    state = loadState();
    renderStorageStatus();
    renderCatalog();

    document.getElementById('workoutForm').addEventListener('submit', handleSaveWorkout);
    document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
    resetForm();
    renderWorkouts();
}

document.addEventListener('DOMContentLoaded', init);
