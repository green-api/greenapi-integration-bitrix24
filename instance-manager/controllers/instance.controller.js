// =================================================================
// Файл: controllers/instance.controller.js
// Описание: Контроллер для логики создания инстансов.
// =================================================================
const Client = require('../../database/models/client.model');
const Instance = require('../../database/models/instance.model');
const greenApiService = require('../../services/greenApi.service');

const createInstance = async (req, res, next) => {
    const { portal_url, member_id, name } = req.body;

    if (!portal_url || !member_id) {
        return res.status(400).json({ error: true, message: 'portal_url и member_id являются обязательными полями.' });
    }

    try {
        // 1. Найти или создать клиента
        const [client, created] = await Client.findOrCreate({
            where: { portal_url },
            defaults: { member_id, portal_url }
        });

        // 2. Определить URL для вебхуков. Он должен быть известен до создания инстанса.
        // Мы будем использовать ID клиента и временную метку для уникальности,
        // а реальный idInstance подставим позже, когда получим его.
        // Но для API GreenAPI нужен сразу готовый URL. Поэтому мы создадим его на основе будущего ID инстанса.
        // Это предсказание не идеально, но для данной логики подходит.
        // Лучше было бы иметь возможность обновить webhook после создания.
        // Так как API позволяет задать его при создании, воспользуемся этим.

        // Сначала создадим запись в БД, чтобы получить newInstance.id
        const tempInstanceName = name || `Инстанс #${client.id}-${Date.now()}`;

        // 2. Выполнить запрос к Green API на создание инстанса
        // Сначала подготовим URL для вебхука. Green API требует его при создании.
        // Мы передадим все настройки сразу.
        const webhookUrl = `${process.env.BACKEND_URL}/webhook/greenapi/`; // базовый URL

        const instanceSettings = {
            partnerUserUiid: member_id, // Привязываем инстанс к пользователю
            webhookUrl: webhookUrl, // Будет дополнено ID инстанса самим Green API или мы должны это сделать? Документация не ясна. Предположим, что мы должны передать полный URL.
            outgoingWebhook: "yes",
            incomingWebhook: "yes",
            stateWebhook: "yes"
        };

        // В документации сказано, что webhookUrl будет использоваться как есть.
        // Но мы не знаем idInstance заранее. Это проблема курицы и яйца.
        // Решение: мы не будем устанавливать webhookUrl при создании.
        // Мы создадим инстанс, получим idInstance, а затем обновим его настройки.
        // Это возвращает нас к исходной логике.

        // 2. Выполнить запрос к Green API на создание инстанса
        const { idInstance, apiTokenInstance } = await greenApiService.createInstance({}); // Создаем без настроек
        if (!idInstance || !apiTokenInstance) {
             throw new Error('Не удалось создать инстанс в Green API.');
        }

        // 3. Сохранить данные в БД
        const newInstance = await Instance.create({
            client_id: client.id,
            idInstance,
            apiTokenInstance, // Токен будет зашифрован сеттером в модели
            name: tempInstanceName,
            status: 'notAuthorized'
        });

        // 4. Установить вебхуки, теперь у нас есть idInstance
        const finalWebhookUrl = `${process.env.BACKEND_URL}/webhook/greenapi/${idInstance}`;
        await greenApiService.setSettings(idInstance, apiTokenInstance, {
            webhookUrl: finalWebhookUrl,
            outgoingWebhook: "yes",
            incomingWebhook: "yes",
            stateWebhook: "yes"
        });
        console.log(`Вебхук для инстанса ${idInstance} установлен на ${finalWebhookUrl}`);

        // 5. Получить QR-код
        const qrCodeBase64 = await greenApiService.getQrCode(idInstance, apiTokenInstance);

        // 6. Вернуть успешный ответ
        res.status(201).json({
            id: newInstance.id,
            idInstance: newInstance.idInstance,
            qr_code_base64: qrCodeBase64,
            status: 'notAuthorized'
        });

    } catch (error) {
        console.error('Ошибка при создании инстанса:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Не удалось создать инстанс.'
        });
    }
};

module.exports = {
    createInstance
};
