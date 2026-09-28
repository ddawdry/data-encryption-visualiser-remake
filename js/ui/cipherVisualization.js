// Dispatches to a cipher's own optional `visualize` function (see the CipherModule typedef
// in cipherRegistry.js). Ciphers without one just don't render anything extra here.
const container = document.getElementById('cipherVisualization');

/**
 * @param {import('../core/cipherRegistry.js').CipherModule} cipher
 * @param {{ text: string, params: Object, mode: 'encrypt'|'decrypt', currentIndex: number }} context
 */
export function render(cipher, context) {
    container.replaceChildren();
    if (typeof cipher.visualize === 'function') {
        container.hidden = false;
        cipher.visualize(container, context);
    } else {
        container.hidden = true;
    }
}

export function clear() {
    container.replaceChildren();
    container.hidden = true;
}
