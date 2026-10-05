/**
 * @typedef {Object} CipherParamField
 * @property {string} name - key used in the params object passed to encrypt/decrypt/stepThrough
 * @property {string} label - human-readable label for the rendered input
 * @property {'number'|'text'} type - input type the options panel should render
 * @property {number} [min] - for type 'number'
 * @property {number} [max] - for type 'number'
 * @property {number} [maxLength] - for type 'text'
 * @property {*} default - default value
 */

/**
 * @typedef {Object} CipherStep
 * @property {number} index - position in the text this step transformed
 * @property {string} oldChar - the original character
 * @property {string} newChar - the character after transformation (equal to oldChar if unchanged)
 * @property {string} explanation - human-readable explanation of what happened at this step
 */

/**
 * @typedef {Object} CipherModule
 * @property {string} id - unique id, e.g. 'caesar'
 * @property {string} name - display name, e.g. 'Caesar Cipher'
 * @property {string} category - grouping for the cipher picker, e.g. 'classical' | 'modern' | 'encoding' | 'analysis'
 * @property {string} description - short blurb shown in the description panel
 * @property {CipherParamField[]} paramsSchema - declarative fields the options panel renders
 * @property {(text: string, params: Object) => string} encrypt - full encrypt, no animation
 * @property {(text: string, params: Object) => string} decrypt - full decrypt, no animation
 * @property {(text: string, params: Object, mode: 'encrypt'|'decrypt') => Generator<CipherStep>} stepThrough - yields one CipherStep per character
 * @property {(container: HTMLElement, context: { text: string, params: Object, mode: 'encrypt'|'decrypt', currentIndex: number }) => void} [visualize] - optional: draws a cipher-specific
 *   visualization (e.g. a zigzag grid) into `container`, called after each step. Ciphers that don't need one
 *   (most of them) simply omit this — the generic char-block diff in visualizer.js is enough on its own.
 */

// Ciphers self-register here (see the CipherModule typedef above).
const ciphers = new Map();

// Ids currently holding a lazy-loading placeholder (see registerLazy below) — allowed to be
// overwritten exactly once, when the real module's own unchanged register() call runs.
const lazyStubIds = new Set();

/** @param {CipherModule} cipher */
export function register(cipher) {
    if (!cipher || !cipher.id || typeof cipher.stepThrough !== 'function') {
        throw new Error('Cipher modules must have an id and a stepThrough() generator function');
    }
    if (ciphers.has(cipher.id) && !lazyStubIds.has(cipher.id)) {
        throw new Error(`A cipher with id "${cipher.id}" is already registered`);
    }
    lazyStubIds.delete(cipher.id);
    ciphers.set(cipher.id, cipher);
}

/**
 * Registers a placeholder immediately (so the cipher shows up in the picker right away) for a
 * cipher whose real implementation is loaded on demand. `load()`'s module is expected to call
 * register() itself when it runs, exactly like every other cipher — that call is what replaces
 * this stub, via the one-time overwrite allowance above. No changes needed to the real cipher
 * file or its tests.
 *
 * @param {Pick<CipherModule, 'id'|'name'|'category'|'description'|'paramsSchema'>} meta
 * @param {() => Promise<unknown>} load
 * @returns {() => Promise<void>} ensureLoaded — call before using the cipher; resolves once the real module has registered
 */
export function registerLazy(meta, load) {
    const notReady = () => {
        throw new Error(`${meta.name} is still loading — please wait a moment and try again`);
    };
    register({
        ...meta,
        encrypt: notReady,
        decrypt: notReady,
        *stepThrough() {
            notReady();
        },
    });
    lazyStubIds.add(meta.id);

    let loadPromise = null;
    return function ensureLoaded() {
        if (!loadPromise) {
            loadPromise = load();
        }
        return loadPromise;
    };
}

/** @returns {CipherModule|undefined} */
export function get(id) {
    return ciphers.get(id);
}

/** @returns {CipherModule[]} */
export function list() {
    return Array.from(ciphers.values());
}
