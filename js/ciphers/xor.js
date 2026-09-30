// XOR cipher: XORs each character's byte with a repeating key, shown as hex since XOR output
// usually isn't printable text. Structurally similar to Polybius (1 char <-> 2 output chars) —
// encrypt expands each input character into a 2-digit hex pair; decrypt consumes hex digit pairs
// to produce one character each, using the same pairing/classification approach.
import { register } from '../core/cipherRegistry.js';

function deriveKeyBytes(rawKey) {
    const key = rawKey || 'KEY';
    return [...key].map((ch) => ch.charCodeAt(0));
}

// Pre-scans decrypt input: a hex digit is either the first or second half of a byte pair (pairs
// are always two consecutive hex digits); anything else (e.g. a space separator) passes through.
function classifyHexPositions(text) {
    const roles = new Array(text.length);
    let i = 0;
    while (i < text.length) {
        if (/[0-9a-fA-F]/.test(text[i])) {
            if (i + 1 >= text.length || !/[0-9a-fA-F]/.test(text[i + 1])) {
                throw new Error("Found a hex digit that isn't part of a complete byte pair");
            }
            roles[i] = 'first';
            roles[i + 1] = 'second';
            i += 2;
        } else {
            roles[i] = 'passthrough';
            i += 1;
        }
    }
    return roles;
}

function* xorSteps(text, params, mode) {
    const keyBytes = deriveKeyBytes(params.key);

    if (mode === 'encrypt') {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            const byte = text.charCodeAt(i) & 0xff;
            const keyByte = keyBytes[i % keyBytes.length];
            const newChar = (byte ^ keyByte).toString(16).padStart(2, '0').toUpperCase();
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `XOR: '${oldChar}' (byte ${byte}) XOR key byte ${keyByte} → 0x${newChar}`,
            };
        }
        return;
    }

    const roles = classifyHexPositions(text);
    let pairCount = 0;
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (roles[i] === 'passthrough') {
            yield {
                index: i,
                oldChar,
                newChar: oldChar,
                explanation: `Not changing '${oldChar}' because it's not a hex digit`,
            };
        } else if (roles[i] === 'first') {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `Reading high hex digit '${oldChar}' — waiting for the low digit`,
            };
        } else {
            const hexPair = text[i - 1] + oldChar;
            const byte = parseInt(hexPair, 16);
            const keyByte = keyBytes[pairCount % keyBytes.length];
            const newChar = String.fromCharCode(byte ^ keyByte);
            pairCount++;
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `Byte 0x${hexPair.toUpperCase()} XOR key byte ${keyByte} → '${newChar}'`,
            };
        }
    }
}

function runFull(text, params, mode) {
    const chars = text.split('');
    for (const step of xorSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'xor',
    name: 'XOR Cipher',
    category: 'modern',
    description:
        'Converts each character to a byte and XORs it with a repeating key, shown as hex (two digits per byte) since the raw result usually isn’t printable text. ' +
        'XOR is its own inverse at the byte level, but here "decrypt" also has to parse hex back into bytes, so encrypt and decrypt use different text representations even though the underlying math is symmetric. ' +
        'Security level: weak with a short, reused key (frequency analysis still works) — genuinely strong only with a key as long as the message, used once (see One-Time Pad). ' +
        'Best used for: seeing how real binary ciphers (and simple obfuscation schemes) work under the hood.',
    paramsSchema: [
        { name: 'key', label: 'Key', type: 'text', default: 'KEY' },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: xorSteps,
});
