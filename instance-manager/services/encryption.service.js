// =================================================================
// Файл: services/encryption.service.js
// Описание: Сервис для шифрования и дешифрования данных.
// =================================================================
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
const IV = Buffer.from(process.env.ENCRYPTION_IV, 'utf8');

if (KEY.length !== 32) {
    throw new Error('Неверная длина ключа шифрования (ENCRYPTION_KEY). Требуется 32 байта.');
}
if (IV.length !== 16) {
    throw new Error('Неверная длина вектора инициализации (ENCRYPTION_IV). Требуется 16 байт.');
}

function encrypt(text) {
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(hash) {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(hash, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
