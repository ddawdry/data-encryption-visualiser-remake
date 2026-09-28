// ROT13: a fixed-shift Caesar cipher (shift = 13). Self-inverse — encrypt and decrypt are the same operation.
import { register } from '../core/cipherRegistry.js';

const SHIFT = 13;

function rotate(char) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    return String.fromCharCode(((code + SHIFT) % 26) + base);
}

function rot13Text(text) {
    return [...text].map(rotate).join('');
}

register({
    id: 'rot13',
    name: 'ROT13',
    category: 'classical',
    description:
        'A special case of the Caesar cipher using a fixed shift of 13. Applying it twice returns the original text, ' +
        'so encryption and decryption are the same operation. ' +
        'Security level: trivial (no key — pure obscurity). Best used for: hiding spoilers or punchlines, not real secrecy.',
    paramsSchema: [],

    encrypt: rot13Text,
    decrypt: rot13Text,

    *stepThrough(text) {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const newChar = rotate(oldChar);
                yield {
                    index: i,
                    oldChar,
                    newChar,
                    explanation: `ROT13: Rotating '${oldChar}' by 13 letters`,
                };
            } else {
                yield {
                    index: i,
                    oldChar,
                    newChar: oldChar,
                    explanation: `Not changing '${oldChar}' because it's not a letter`,
                };
            }
        }
    },
});
