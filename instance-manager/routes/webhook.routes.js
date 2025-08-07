// =================================================================
// Файл: routes/webhook.routes.js
// Описание: Маршруты для приема вебхуков от Green API.
// =================================================================
const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/webhook.controller');

// POST /webhook/greenapi/:idInstance
router.post('/greenapi/:idInstance', webhookController.handleWebhook);

module.exports = router;
