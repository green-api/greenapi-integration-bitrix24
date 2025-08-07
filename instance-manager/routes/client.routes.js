// =================================================================
// Файл: routes/client.routes.js
// Описание: Маршруты для работы с клиентами (порталами).
// =================================================================
const express = require('express');
const router = express.Router();
const clientController = require('../../controllers/client.controller');

// POST /api/v1/client/status
router.post('/status', clientController.getClientStatus);

module.exports = router;
