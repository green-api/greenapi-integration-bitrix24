// =================================================================
// Файл: routes/index.js
// Описание: Корневой роутер, который объединяет все остальные.
// =================================================================
const express = require('express');
const router = express.Router();

const clientRoutes = require('./client.routes');
const instanceRoutes = require('./instance.routes');
const webhookRoutes = require('./webhook.routes');

// Все API-маршруты защищены токеном
router.use('/api/v1', require('../middleware/auth.middleware'));

router.use('/api/v1/client', clientRoutes);
router.use('/api/v1/instance', instanceRoutes);

// Вебхуки не требуют авторизации, так как запросы приходят от Green API
router.use('/webhook', webhookRoutes);

// Тестовый маршрут для проверки работы сервера
router.get('/', (req, res) => {
    res.send('Сервер управления инстансами Green API работает!');
});

module.exports = router;
