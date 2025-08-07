// =================================================================
// Файл: database/models/client.model.js
// Описание: Модель Sequelize для таблицы "Clients".
// =================================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    portal_url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'URL-адрес портала Битрикс24'
    },
    member_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Уникальный ID портала от Битрикс24'
    }
}, {
    tableName: 'Clients',
    timestamps: true, // Добавляет поля createdAt и updatedAt
});

module.exports = Client;
