// =================================================================
// Файл: controllers/webhook.controller.js
// Описание: Контроллер для обработки входящих вебхуков от Green API.
// =================================================================
const Instance = require('../../database/models/instance.model');

const handleWebhook = async (req, res, next) => {
    const { idInstance } = req.params;
    const webhookData = req.body;

    console.log(`Получен вебхук для инстанса ${idInstance}:`, JSON.stringify(webhookData, null, 2));

    try {
        // Находим инстанс в нашей БД, чтобы убедиться, что он легитимен
        const instance = await Instance.findOne({ where: { idInstance } });
        if (!instance) {
            console.warn(`Получен вебхук для неизвестного инстанса: ${idInstance}`);
            return res.status(404).send('Instance not found');
        }

        // Логика обработки вебхука
        if (webhookData.typeWebhook === 'stateInstanceChanged') {
            const newState = webhookData.stateInstance;
            console.log(`Статус инстанса ${idInstance} изменен на: ${newState}`);

            // Обновляем статус в БД
            instance.status = newState;

            // Если инстанс авторизован, сохраняем номер телефона
            if (newState === 'authorized' && webhookData.wid) {
                // wid обычно имеет формат "номер@c.us"
                instance.phone_number = webhookData.wid.split('@')[0];
                console.log(`Номер телефона для инстанса ${idInstance} установлен: ${instance.phone_number}`);
            }

            await instance.save();
        } else if (webhookData.typeWebhook === 'incomingMessageReceived') {
            console.log(`Новое входящее сообщение для ${idInstance} от ${webhookData.senderData.sender}`);
            // Здесь будет логика для отправки сообщения в Открытую Линию Битрикс24
        }

        // Отвечаем Green API, что вебхук получен успешно
        res.status(200).send('OK');

    } catch (error) {
        console.error(`Ошибка при обработке вебхука для ${idInstance}:`, error);
        // Не отправляем ошибку в next(), чтобы не ронять сервер из-за вебхуков
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    handleWebhook
};
