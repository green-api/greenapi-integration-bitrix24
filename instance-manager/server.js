// =================================================================
// Файл: server.js
// Описание: Главный файл приложения. Инициализирует сервер и базу данных.
// =================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sequelize = require('./database/database');
const mainRouter = require('./routes/index');

// Инициализация моделей для их регистрации в Sequelize
require('./database/models/client.model');
require('./database/models/instance.model');

const app = express();

// Настройка middleware
app.use(cors()); // Разрешает кросс-доменные запросы
app.use(bodyParser.json()); // Парсит тело запроса в формате JSON

// Основной роутер приложения
app.use('/', mainRouter);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Произошла ошибка:', err.stack);
    res.status(500).send({ error: true, message: 'Внутренняя ошибка сервера!' });
});

const PORT = process.env.PORT || 4000;

// Синхронизация с БД и запуск сервера
// force: true - будет пересоздавать таблицы при каждом запуске. Используйте для разработки.
// В продакшене установите force: false.
sequelize.sync({ force: false }).then(() => {
    console.log('База данных успешно синхронизирована.');
    app.listen(PORT, () => {
        console.log(`Сервер запущен на порту ${PORT}`);
    });
}).catch(err => {
    console.error('Ошибка синхронизации с базой данных:', err);
});
