// =================================================================
// Файл: controllers/client.controller.js
// Описание: Контроллер для обработки логики, связанной с клиентами.
// =================================================================
const Client = require('../../database/models/client.model');
const Instance = require('../../database/models/instance.model');
const greenApiService = require('../../services/greenApi.service');

const getClientStatus = async (req, res, next) => {
    const { portal_url } = req.body;

    if (!portal_url) {
        return res.status(400).json({ error: true, message: 'portal_url является обязательным полем.' });
    }

    try {
        const client = await Client.findOne({
            where: { portal_url },
            include: [{ model: Instance, as: 'instances' }]
        });

        if (!client) {
            return res.status(200).json({
                client_exists: false,
                instances: []
            });
        }

        // Обновляем статусы инстансов "на лету"
        const instancesWithStatus = await Promise.all(
            client.instances.map(async (instance) => {
                const decryptedToken = instance.getDecryptedToken();
                const currentStatus = await greenApiService.getStateInstance(instance.idInstance, decryptedToken);

                // Опционально: можно обновлять статус и номер телефона в БД, если они изменились
                if (currentStatus !== instance.status && currentStatus !== 'error') {
                   instance.status = currentStatus;
                   // Здесь можно добавить логику получения номера телефона, если статус стал 'authorized'
                   await instance.save();
                }

                return {
                    id: instance.id,
                    idInstance: instance.idInstance,
                    name: instance.name,
                    phone_number: instance.phone_number,
                    status: currentStatus
                };
            })
        );

        res.status(200).json({
            client_exists: true,
            instances: instancesWithStatus
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getClientStatus
};
