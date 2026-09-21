// Caches emitted steps so "back" can replay from here instead of rewinding a generator.
const stack = [];

/** @param {import('./cipherRegistry.js').CipherStep} step */
export function push(step) {
    stack.push(step);
}

/** @returns {import('./cipherRegistry.js').CipherStep|null} */
export function pop() {
    return stack.length > 0 ? stack.pop() : null;
}

export function clear() {
    stack.length = 0;
}

export function canGoBack() {
    return stack.length > 0;
}
