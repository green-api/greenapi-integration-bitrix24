// =================================================================
// Файл: routes/instance.routes.js
// Описание: Маршруты для создания и управления инстансами.
// =================================================================
const express = require('express');
const router = express.Router();
const instanceController = require('../../controllers/instance.controller');

// POST /api/v1/instance/create
router.post('/create', instanceController.createInstance);

module.exports = router;
