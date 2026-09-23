// Vigenere cipher: shifts each letter by an amount derived from a repeating keyword.
import { register } from '../core/cipherRegistry.js';

function shiftLetter(char, shift) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    const shifted = ((code + shift) % 26 + 26) % 26;
    return String.fromCharCode(shifted + base);
}

function deriveKeyword(rawKeyword) {
    const cleaned = (rawKeyword || '').toUpperCase().replace(/[^A-Z]/g, '');
    return cleaned || 'KEY';
}

register({
    id: 'vigenere',
    name: 'Vigenere Cipher',
    category: 'classical',
    description:
        'Uses a keyword to create a different shift for each letter, cycling through the keyword\'s letters. ' +
        'Example: with key "KEY", encrypting "HELLOWORL" gives "RIDVSUOVD". ' +
        'Security level: better than Caesar, but still breakable. Best used for: learning about advanced ciphers.',
    paramsSchema: [
        { name: 'keyword', label: 'Secret Key', type: 'text', default: 'KEY' },
    ],

    encrypt(text, params) {
        const keyword = deriveKeyword(params.keyword);
        return [...text]
            .map((ch, i) => {
                if (!/[a-zA-Z]/.test(ch)) return ch;
                const shift = keyword[i % keyword.length].charCodeAt(0) - 65;
                return shiftLetter(ch, shift);
            })
            .join('');
    },

    decrypt(text, params) {
        const keyword = deriveKeyword(params.keyword);
        return [...text]
            .map((ch, i) => {
                if (!/[a-zA-Z]/.test(ch)) return ch;
                const shift = keyword[i % keyword.length].charCodeAt(0) - 65;
                return shiftLetter(ch, -shift);
            })
            .join('');
    },

    *stepThrough(text, params, mode) {
        const keyword = deriveKeyword(params.keyword);

        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const keyLetter = keyword[i % keyword.length];
                const shift = keyLetter.charCodeAt(0) - 65;
                const direction = mode === 'encrypt' ? shift : -shift;
                const newChar = shiftLetter(oldChar, direction);
                const sign = mode === 'encrypt' ? '+' : '-';
                yield {
                    index: i,
                    oldChar,
                    newChar,
                    explanation: `Vigenere Cipher: Using key letter '${keyLetter}' (shift: ${sign}${shift}) on '${oldChar}'`,
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
