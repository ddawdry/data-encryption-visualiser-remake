// Drives step-through animation using generator functions yielded from cipher modules.
let activeGenerator = null;
let position = 0;
let finished = true;

/**
 * @param {import('./cipherRegistry.js').CipherModule} cipher
 * @param {string} text
 * @param {Object} params
 * @param {'encrypt'|'decrypt'} mode
 */
export function start(cipher, text, params, mode) {
    activeGenerator = cipher.stepThrough(text, params, mode);
    position = 0;
    finished = text.length === 0;
}

/** @returns {import('./cipherRegistry.js').CipherStep|null} */
export function next() {
    if (!activeGenerator || finished) return null;

    const result = activeGenerator.next();
    if (result.done) {
        finished = true;
        return null;
    }

    position++;
    return result.value;
}

export function isDone() {
    return finished;
}

export function getPosition() {
    return position;
}
