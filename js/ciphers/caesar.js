// Caesar cipher: shifts each letter forward (encrypt) or backward (decrypt) in the alphabet.
import { register } from '../core/cipherRegistry.js';

function shiftLetter(char, shift) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    const shifted = ((code + shift) % 26 + 26) % 26;
    return String.fromCharCode(shifted + base);
}

register({
    id: 'caesar',
    name: 'Caesar Cipher',
    category: 'classical',
    description:
        'Shifts each letter forward or backward in the alphabet by a fixed amount. ' +
        'Example: with shift = 3, encryption maps A -> D, B -> E, C -> F. ' +
        'Security level: very weak (easy to crack). Best used for: learning about encryption.',
    paramsSchema: [
        { name: 'shift', label: 'Shift Amount', type: 'number', min: 1, max: 25, default: 3 },
    ],

    encrypt(text, params) {
        const shift = Number(params.shift);
        return [...text].map((ch) => shiftLetter(ch, shift)).join('');
    },

    decrypt(text, params) {
        const shift = Number(params.shift);
        return [...text].map((ch) => shiftLetter(ch, -shift)).join('');
    },

    *stepThrough(text, params, mode) {
        const shift = Number(params.shift);
        const direction = mode === 'encrypt' ? shift : -shift;

        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const newChar = shiftLetter(oldChar, direction);
                const verb = mode === 'encrypt' ? 'forward' : 'backward';
                yield {
                    index: i,
                    oldChar,
                    newChar,
                    explanation: `Caesar Cipher: Moving '${oldChar}' ${verb} by ${shift} letters`,
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
