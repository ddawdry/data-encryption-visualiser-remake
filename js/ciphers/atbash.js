// Atbash: mirrors each letter in the alphabet (A<->Z, B<->Y, ...). Self-inverse, like ROT13.
import { register } from '../core/cipherRegistry.js';

function mirror(char) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    return String.fromCharCode(25 - code + base);
}

function atbashText(text) {
    return [...text].map(mirror).join('');
}

register({
    id: 'atbash',
    name: 'Atbash',
    category: 'classical',
    description:
        'Maps each letter to its mirror image in the alphabet — A becomes Z, B becomes Y, and so on. ' +
        'Like ROT13, applying it twice returns the original text, so encryption and decryption are the same operation. ' +
        'Security level: trivial (no key — a fixed, well-known pattern). Best used for: simple puzzles, not real secrecy.',
    paramsSchema: [],

    encrypt: atbashText,
    decrypt: atbashText,

    *stepThrough(text) {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const newChar = mirror(oldChar);
                yield {
                    index: i,
                    oldChar,
                    newChar,
                    explanation: `Atbash: Mirroring '${oldChar}' to '${newChar}'`,
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
