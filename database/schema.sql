-- НОРМАЛИЗОВАННАЯ СХЕМА ДО 3NF ДЛЯ SQLITE
-- Приложение «Трекер тренировок»
-- Описание процесса нормализации: database/normalization.md

-- В SQLite проверка внешних ключей включается для каждого подключения отдельно
PRAGMA foreign_keys = ON;

-- Пользователи
CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Группы мышц: грудь, спина, ноги, плечи, руки, пресс
CREATE TABLE Muscle_Groups (
    muscle_group_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Справочник упражнений.
-- user_id пуст у предустановленных упражнений и заполнен у собственных упражнений пользователя
CREATE TABLE Exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    muscle_group_id INTEGER NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (muscle_group_id) REFERENCES Muscle_Groups(muscle_group_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Тренировки.
-- workout_date — плановая дата, started_at и finished_at — фактическое время начала и конца.
-- Статус и длительность не хранятся, потому что следуют из started_at и finished_at:
--   запланирована — started_at пуст; идёт — started_at заполнен, finished_at пуст;
--   завершена — finished_at заполнен; длительность = finished_at - started_at
CREATE TABLE Workouts (
    workout_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    workout_date TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    user_id INTEGER NOT NULL,
    CHECK (finished_at IS NULL OR (started_at IS NOT NULL AND finished_at >= started_at)),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Связь «многие-ко-многим» между тренировками и упражнениями.
-- Составной первичный ключ не даёт добавить одно упражнение в тренировку дважды.
-- Упражнение, которое есть хотя бы в одной тренировке, удалить из справочника нельзя
CREATE TABLE Workout_Exercises (
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1),
    PRIMARY KEY (workout_id, exercise_id),
    FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES Exercises(exercise_id)
);

-- Подходы упражнения в тренировке.
-- reps и weight_kg могут быть пустыми, пока подход не выполнен
CREATE TABLE Sets (
    set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_number INTEGER NOT NULL CHECK (set_number >= 1),
    reps INTEGER CHECK (reps BETWEEN 1 AND 999 AND reps = CAST(reps AS INTEGER)),
    weight_kg REAL CHECK (weight_kg BETWEEN 0 AND 500 AND weight_kg * 2 = CAST(weight_kg * 2 AS INTEGER)),
    is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    UNIQUE (workout_id, exercise_id, set_number),
    CHECK (is_completed = 0 OR (reps IS NOT NULL AND weight_kg IS NOT NULL)),
    FOREIGN KEY (workout_id, exercise_id)
        REFERENCES Workout_Exercises(workout_id, exercise_id) ON DELETE CASCADE
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_workouts_user_id ON Workouts(user_id);                           -- тренировки пользователя
CREATE INDEX idx_workouts_workout_date ON Workouts(workout_date);                 -- сортировка и отбор по дате
CREATE INDEX idx_exercises_muscle_group_id ON Exercises(muscle_group_id);         -- фильтр справочника по группе мышц
CREATE INDEX idx_exercises_user_id ON Exercises(user_id);                         -- собственные упражнения пользователя
CREATE INDEX idx_workout_exercises_exercise_id ON Workout_Exercises(exercise_id); -- тренировки с данным упражнением
CREATE INDEX idx_sets_exercise_id ON Sets(exercise_id);                           -- прогресс и рекорды по упражнению
