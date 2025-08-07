// =================================================================
// Файл: services/greenApi.service.js
// Описание: Сервис для инкапсуляции всех запросов к Green API.
// =================================================================
const crypto = require('crypto');
const axios = require('axios');

const greenApi = axios.create({
    baseURL: process.env.GREEN_API_URL,
});

/**
 * Создает новый инстанс через партнерский API.
 * @param {object} settings - Настройки для создания инстанса, включая webhookUrl
 * @returns {Promise<{idInstance: string, apiTokenInstance: string}>}
 */
const createInstance = async (settings) => {
    const partnerToken = process.env.GREEN_API_PARTNER_TOKEN;
    if (!partnerToken) {
        throw new Error('GREEN_API_PARTNER_TOKEN is not defined in .env file');
    }

    try {
        const response = await greenApi.post(`/partner/createInstance/${partnerToken}`, settings);
        // Ожидаемый ответ: { idInstance, apiTokenInstance, typeInstance }
        return response.data;
    } catch (error) {
        console.error('Ошибка при создании инстанса в Green API:', error.response?.data || error.message);
        throw new Error('Не удалось создать инстанс в Green API.');
    }
};


/**
 * Получает состояние инстанса (авторизован, не авторизован и т.д.).
 * @param {string} idInstance
 * @param {string} apiTokenInstance
 * @returns {Promise<string>} 'authorized', 'notAuthorized', 'sleepMode', etc.
 */
const getStateInstance = async (idInstance, apiTokenInstance) => {
    try {
        const response = await greenApi.get(`/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`);
        return response.data.stateInstance;
    } catch (error) {
        console.error(`Ошибка при получении статуса для инстанса ${idInstance}:`, error.response?.data || error.message);
        // Если инстанс не найден (например, удален), возвращаем особый статус
        if (error.response && error.response.status === 404) {
            return 'deleted';
        }
        return 'error';
    }
};

/**
 * Получает QR-код для авторизации.
 * @param {string} idInstance
 * @param {string} apiTokenInstance
 * @returns {Promise<string>} QR-код в формате Base64
 */
const getQrCode = async (idInstance, apiTokenInstance) => {
    try {
        // Green API может требовать несколько запросов для генерации QR
        await new Promise(resolve => setTimeout(resolve, 1000)); // Небольшая задержка
        const response = await greenApi.get(`/waInstance${idInstance}/qr/${apiTokenInstance}`);
        return response.data.message;
    } catch (error) {
        console.error(`Ошибка при получении QR-кода для инстанса ${idInstance}:`, error.response?.data || error.message);
        throw new Error('Не удалось получить QR-код от Green API.');
    }
};

/**
 * Устанавливает настройки для инстанса, в частности webhookUrl.
 * @param {string} idInstance
 * @param {string} apiTokenInstance
 * @param {object} settings - Объект настроек
 * @returns {Promise<boolean>}
 */
const setSettings = async (idInstance, apiTokenInstance, settings) => {
    try {
        await greenApi.post(`/waInstance${idInstance}/setSettings/${apiTokenInstance}`, settings);
        return true;
    } catch (error) {
        console.error(`Ошибка при установке настроек для инстанса ${idInstance}:`, error.response?.data || error.message);
        throw new Error('Не удалось установить настройки в Green API.');
    }
};

module.exports = {
    createInstance,
    getStateInstance,
    getQrCode,
    setSettings,
};
