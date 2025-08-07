// =================================================================
// Файл: database/database.js
// Описание: Настройка подключения к базе данных с помощью Sequelize.
// =================================================================
const { Sequelize } = require('sequelize');

// Используем SQLite для простоты. Файл `database.sqlite` будет создан в корне проекта.
// Для продакшена можно легко заменить на PostgreSQL, MySQL и т.д.
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false // Отключить логирование SQL-запросов в консоль
});

module.exports = sequelize;
