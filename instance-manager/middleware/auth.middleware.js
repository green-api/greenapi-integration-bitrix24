// =================================================================
// Файл: middleware/auth.middleware.js
// Описание: Middleware для проверки токена авторизации.
// =================================================================
const checkAuthToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: true, message: 'Токен доступа отсутствует.' });
    }

    if (token !== process.env.AUTH_TOKEN) {
        return res.status(403).json({ error: true, message: 'Неверный токен доступа.' });
    }

    next();
};

module.exports = checkAuthToken;
