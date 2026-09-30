// Base64 and Hex: NOT ciphers — encodings. No key, no secret, trivially reversible by anyone.
// Registered together in one file (unlike every other cipher here) because the roadmap bundles
// them as a single checkpoint and they share one job: making "encoding isn't encryption" visible
// in the UI itself, not just in prose — see the 'encoding' category in cipherRegistry's picker.
import { register } from '../core/cipherRegistry.js';

const ENCODING_PITCH =
    'This is an encoding, not a cipher: there’s no key and nothing secret about it — anyone can reverse it instantly, by eye or with any online tool. ' +
    'Encodings exist for compatibility (representing data as plain text), not for secrecy. Seeing scrambled-looking text does not mean it’s encrypted. ' +
    'Security level: none — zero confidentiality. ';

// --- Base64 ---
// Works on 3-byte groups -> 4 output characters, not a clean 1:1 or 1:2 mapping like every other
// module here. To keep "one step per input character" (see docs/architecture.md), the full 4-char
// result for a group is written to the FIRST of its (up to 3) input positions; the other positions
// in that group contribute nothing (''), same technique as Polybius's variable-width steps.
// oldChar still stays the single original character at that exact slot, not the whole group — only
// the explanation text mentions the group, since oldChar is what historyStack/"Back" reverts to.

function assertLatin1(text) {
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 255) {
            throw new Error('Base64 here only supports standard text (character codes 0-255)');
        }
    }
}

function* base64Steps(text, params, mode) {
    if (mode === 'encrypt') {
        assertLatin1(text);
        for (let i = 0; i < text.length; i += 3) {
            const group = text.slice(i, i + 3);
            const encoded = btoa(group);
            yield {
                index: i,
                oldChar: text[i],
                newChar: encoded,
                explanation: `Base64: the group '${group}' (${group.length} byte${group.length === 1 ? '' : 's'}) → '${encoded}'`,
            };
            for (let j = i + 1; j < Math.min(i + 3, text.length); j++) {
                yield {
                    index: j,
                    oldChar: text[j],
                    newChar: '',
                    explanation: `Part of the group starting at position ${i + 1}, already encoded above`,
                };
            }
        }
        return;
    }

    for (let i = 0; i < text.length; i += 4) {
        const group = text.slice(i, i + 4);
        let decoded;
        try {
            decoded = atob(group);
        } catch {
            throw new Error(`'${group}' isn't valid Base64`);
        }
        yield {
            index: i,
            oldChar: text[i],
            newChar: decoded,
            explanation: `Base64: '${group}' → the group '${decoded}' (${decoded.length} byte${decoded.length === 1 ? '' : 's'})`,
        };
        for (let j = i + 1; j < Math.min(i + 4, text.length); j++) {
            yield {
                index: j,
                oldChar: text[j],
                newChar: '',
                explanation: `Part of the group starting at position ${i + 1}, already decoded above`,
            };
        }
    }
}

function runBase64(text, params, mode) {
    const chars = text.split('');
    for (const step of base64Steps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'base64',
    name: 'Base64',
    category: 'encoding',
    description:
        'Represents every 3 bytes of input as 4 printable characters from a 64-character alphabet (A-Z, a-z, 0-9, +, /). ' +
        ENCODING_PITCH +
        'Best used for: recognizing the difference between hiding information’s meaning (encoding) and hiding its content from attackers (encryption).',
    paramsSchema: [],
    encrypt(text, params) {
        return runBase64(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runBase64(text, params, 'decrypt');
    },
    stepThrough: base64Steps,
});

// --- Hex ---
// Simple 1 char <-> 2 hex digits, same technique as the XOR cipher's hex handling, just without
// any key/XOR step — it's a plain byte-to-hex representation.

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

function* hexSteps(text, params, mode) {
    if (mode === 'encrypt') {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            const byte = oldChar.charCodeAt(0) & 0xff;
            const newChar = byte.toString(16).padStart(2, '0').toUpperCase();
            yield { index: i, oldChar, newChar, explanation: `Hex: '${oldChar}' is byte ${byte} → '${newChar}'` };
        }
        return;
    }

    const roles = classifyHexPositions(text);
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (roles[i] === 'passthrough') {
            yield { index: i, oldChar, newChar: oldChar, explanation: `Not changing '${oldChar}' because it's not a hex digit` };
        } else if (roles[i] === 'first') {
            yield { index: i, oldChar, newChar: '', explanation: `Reading high hex digit '${oldChar}' — waiting for the low digit` };
        } else {
            const hexPair = text[i - 1] + oldChar;
            const byte = parseInt(hexPair, 16);
            const newChar = String.fromCharCode(byte);
            yield { index: i, oldChar, newChar, explanation: `Byte 0x${hexPair.toUpperCase()} → '${newChar}'` };
        }
    }
}

function runHex(text, params, mode) {
    const chars = text.split('');
    for (const step of hexSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'hex',
    name: 'Hex',
    category: 'encoding',
    description:
        'Represents each character as a 2-digit hexadecimal byte value (e.g. \'A\' is byte 65, so \'41\'). ' +
        ENCODING_PITCH +
        'Best used for: recognizing encoded data you might see in URLs, logs, or debugging tools, and knowing it isn’t secret.',
    paramsSchema: [],
    encrypt(text, params) {
        return runHex(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runHex(text, params, 'decrypt');
    },
    stepThrough: hexSteps,
});
