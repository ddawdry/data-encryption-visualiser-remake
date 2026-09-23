// Substitution cipher: maps each letter to a different letter using a full 26-letter key.
import { register } from '../core/cipherRegistry.js';

const NORMAL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeKey(rawKey) {
    return (rawKey || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function validateKey(key) {
    if (key.length !== 26 || new Set(key).size !== 26) {
        throw new Error('Your key needs all 26 letters with no repeats');
    }
}

register({
    id: 'substitution',
    name: 'Substitution Cipher',
    category: 'classical',
    description:
        'Replaces each letter with a different letter from your own alphabet key (all 26 letters, no repeats). ' +
        'Example key: QWERTYUIOPASDFGHJKLZXCVBNM — A becomes Q, B becomes W, and so on. ' +
        'Security level: medium (can be broken with letter frequency analysis). Best used for: simple secret messages and puzzles.',
    paramsSchema: [
        { name: 'key', label: 'Alphabet Key', type: 'text', maxLength: 26, default: 'QWERTYUIOPASDFGHJKLZXCVBNM' },
    ],

    encrypt(text, params) {
        const key = normalizeKey(params.key);
        validateKey(key);
        return [...text]
            .map((ch) => {
                if (!/[a-zA-Z]/.test(ch)) return ch;
                const isUpper = ch === ch.toUpperCase();
                const index = ch.toUpperCase().charCodeAt(0) - 65;
                const mapped = key[index];
                return isUpper ? mapped : mapped.toLowerCase();
            })
            .join('');
    },

    decrypt(text, params) {
        const key = normalizeKey(params.key);
        validateKey(key);
        return [...text]
            .map((ch) => {
                if (!/[a-zA-Z]/.test(ch)) return ch;
                const isUpper = ch === ch.toUpperCase();
                const index = key.indexOf(ch.toUpperCase());
                if (index === -1) {
                    throw new Error(`Can't find '${ch}' in your key`);
                }
                const mapped = NORMAL_ALPHABET[index];
                return isUpper ? mapped : mapped.toLowerCase();
            })
            .join('');
    },

    *stepThrough(text, params, mode) {
        const key = normalizeKey(params.key);
        validateKey(key);

        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (!/[a-zA-Z]/.test(oldChar)) {
                yield {
                    index: i,
                    oldChar,
                    newChar: oldChar,
                    explanation: `Not changing '${oldChar}' because it's not a letter`,
                };
                continue;
            }

            const isUpper = oldChar === oldChar.toUpperCase();
            let newChar;
            let explanation;

            if (mode === 'encrypt') {
                const index = oldChar.toUpperCase().charCodeAt(0) - 65;
                const mapped = key[index];
                newChar = isUpper ? mapped : mapped.toLowerCase();
                explanation = `Substitution Cipher: Changing '${oldChar}' to '${newChar}'`;
            } else {
                const upperChar = oldChar.toUpperCase();
                const index = key.indexOf(upperChar);
                if (index === -1) {
                    throw new Error(`Can't find '${oldChar}' in your key`);
                }
                const mapped = NORMAL_ALPHABET[index];
                newChar = isUpper ? mapped : mapped.toLowerCase();
                explanation = `Substitution Cipher: Changing '${oldChar}' back to '${newChar}'`;
            }

            yield { index: i, oldChar, newChar, explanation };
        }
    },
});
