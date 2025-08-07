// =================================================================
// Файл: database/models/instance.model.js
// Описание: Модель Sequelize для таблицы "Instances".
// =================================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Client = require('./client.model');
const { encrypt, decrypt } = require('../../services/encryption.service');

const Instance = sequelize.define('Instance', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    client_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Client,
            key: 'id'
        },
        comment: 'Внешний ключ к таблице Clients'
    },
    idInstance: {
        type: DataTypes.STRING,
        allowNull: false
    },
    apiTokenInstance: {
        type: DataTypes.STRING,
        allowNull: false,
        // Сеттер для шифрования токена перед сохранением в БД
        set(value) {
            this.setDataValue('apiTokenInstance', encrypt(value));
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Пользовательское название (например, "Отдел продаж")'
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'notAuthorized',
        comment: 'Статус: notAuthorized, authorized, sleepMode и т.д.'
    }
}, {
    tableName: 'Instances',
    timestamps: true
});

// Определение связи "один ко многим"
Client.hasMany(Instance, { foreignKey: 'client_id', as: 'instances' });
Instance.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Добавляем "прототипный" метод для получения расшифрованного токена
Instance.prototype.getDecryptedToken = function() {
    return decrypt(this.apiTokenInstance);
};

module.exports = Instance;
