// Ciphers self-register here: { id, name, category, description, paramsSchema, encrypt, decrypt, stepThrough }
const ciphers = new Map();

export function register(cipher) {
    if (!cipher || !cipher.id || typeof cipher.stepThrough !== 'function') {
        throw new Error('Cipher modules must have an id and a stepThrough() generator function');
    }
    if (ciphers.has(cipher.id)) {
        throw new Error(`A cipher with id "${cipher.id}" is already registered`);
    }
    ciphers.set(cipher.id, cipher);
}

export function get(id) {
    return ciphers.get(id);
}

export function list() {
    return Array.from(ciphers.values());
}
