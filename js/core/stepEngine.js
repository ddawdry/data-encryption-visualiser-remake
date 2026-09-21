// Drives step-through animation using generator functions yielded from cipher modules.
import * as historyStack from './historyStack.js';

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
    historyStack.clear();
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
    historyStack.push(result.value);
    return result.value;
}

/** @returns {import('./cipherRegistry.js').CipherStep|null} */
export function back() {
    if (!historyStack.canGoBack()) return null;

    const step = historyStack.pop();
    position--;
    finished = false;
    return step;
}

export function canGoBack() {
    return historyStack.canGoBack();
}

export function isDone() {
    return finished;
}

export function getPosition() {
    return position;
}
