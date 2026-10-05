// SHA-256: a cryptographic HASH function, not a cipher — there's no key, and it's one-way (no
// decrypt exists). It's included here to show the avalanche effect: flip one bit of the input and
// the entire output changes unpredictably. Hand-rolled rather than using the browser's native
// crypto.subtle.digest(), since that API is asynchronous (returns a Promise) and every other part
// of this app's step engine is synchronous by design — introducing async here would mean either
// rewriting stepEngine for every cipher or giving this one a special-cased code path, neither of
// which is worth it for a hash demo. Verified against known SHA-256 test vectors (empty string and
// "abc") and cross-checked against Node's native crypto for strings with multi-byte UTF-8
// characters, since hand-rolled cryptographic code is exactly where subtle bugs hide.
//
// This file is dynamically imported (see app.js) rather than statically imported at startup,
// since it's one of the larger cipher modules — its id/name/category/description/paramsSchema
// below are DUPLICATED in app.js's lazy-cipher registration, so the picker can show it before
// this file has actually loaded. Keep both copies in sync if you change any of those fields.
import { register } from '../core/cipherRegistry.js';

const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H0 = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
}

function toUtf8Bytes(message) {
    const bytes = [];
    for (let i = 0; i < message.length; i++) {
        const code = message.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code >= 0xd800 && code < 0xdc00 && i + 1 < message.length) {
            const next = message.charCodeAt(i + 1);
            if (next >= 0xdc00 && next < 0xe000) {
                const codePoint = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                bytes.push(
                    0xf0 | (codePoint >> 18),
                    0x80 | ((codePoint >> 12) & 0x3f),
                    0x80 | ((codePoint >> 6) & 0x3f),
                    0x80 | (codePoint & 0x3f),
                );
                i++;
            } else {
                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            }
        } else {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return bytes;
}

function sha256Hex(message) {
    const bytes = toUtf8Bytes(message);
    const bitLength = bytes.length * 8;

    bytes.push(0x80);
    while (bytes.length % 64 !== 56) {
        bytes.push(0);
    }
    const highLen = Math.floor(bitLength / 0x100000000);
    const lowLen = bitLength >>> 0;
    for (let shift = 24; shift >= 0; shift -= 8) bytes.push((highLen >>> shift) & 0xff);
    for (let shift = 24; shift >= 0; shift -= 8) bytes.push((lowLen >>> shift) & 0xff);

    let h = H0.slice();
    const w = new Array(64);

    for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
        for (let t = 0; t < 16; t++) {
            const o = chunkStart + t * 4;
            w[t] = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
        }
        for (let t = 16; t < 64; t++) {
            const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
            const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;
        for (let t = 0; t < 64; t++) {
            const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (hh + s1 + ch + K[t] + w[t]) >>> 0;
            const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (s0 + maj) >>> 0;

            hh = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        h = [
            (h[0] + a) >>> 0, (h[1] + b) >>> 0, (h[2] + c) >>> 0, (h[3] + d) >>> 0,
            (h[4] + e) >>> 0, (h[5] + f) >>> 0, (h[6] + g) >>> 0, (h[7] + hh) >>> 0,
        ];
    }

    return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}

// Hashing has no "decrypt" — both directions just compute the same hash of the full message, one
// step per input character so this still fits the generic engine, but only the LAST step actually
// carries the (64-character) result; every earlier step contributes '' (same zero-width-step
// technique as Polybius/Base64/RSA), since the hash can't be known until the whole message is in.
function* sha256Steps(text) {
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (i === text.length - 1) {
            const hash = sha256Hex(text);
            yield {
                index: i,
                oldChar,
                newChar: hash,
                explanation: `SHA-256 of the full message → ${hash}`,
            };
        } else {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `'${oldChar}' added to the message — the hash can't be known until the whole message is in`,
            };
        }
    }
}

function runFull(text) {
    const chars = text.split('');
    for (const step of sha256Steps(text)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'sha256',
    name: 'SHA-256 (Hash)',
    category: 'modern',
    description:
        'A cryptographic hash, not a cipher: there’s no key and no decrypt, because hashing only goes one way. ' +
        'Encrypt and Decrypt do the same thing here — compute the hash — since there’s nothing to reverse. ' +
        'The defining property is the avalanche effect: flipping even a single bit of the input changes roughly half the output bits, unpredictably (see the panel above for a live comparison). ' +
        'Hashes are used to verify data hasn’t changed (file checksums, password storage, blockchain), not to hide it — the output is always the same length regardless of input size, and the input generally can’t be recovered from it. ' +
        'Security level: not applicable in the encryption sense — SHA-256 itself is considered cryptographically strong for integrity checking. ' +
        'Best used for: seeing the avalanche effect and understanding why "hashing" and "encrypting" are different operations with different purposes.',
    paramsSchema: [],

    encrypt(text) {
        return runFull(text);
    },
    decrypt(text) {
        return runFull(text);
    },
    stepThrough: sha256Steps,

    // Compares the hash of the current message against the hash with just the last character's
    // lowest bit flipped — the avalanche effect, made visible rather than just stated.
    visualize(container, { text }) {
        if (!text) return;

        const lastCharCode = text.charCodeAt(text.length - 1);
        const flippedChar = String.fromCharCode(lastCharCode ^ 1);
        const modifiedText = text.slice(0, -1) + flippedChar;

        const hashA = sha256Hex(text);
        const hashB = sha256Hex(modifiedText);

        const wrapper = document.createElement('div');
        wrapper.className = 'sha256-avalanche';

        const note = document.createElement('div');
        note.className = 'sha256-note';
        note.textContent = `Flipping one bit of the last character ('${text.slice(-1)}' → '${flippedChar}') changes the entire hash:`;
        wrapper.appendChild(note);

        const renderRow = (label, hash, compareHash) => {
            const row = document.createElement('div');
            row.className = 'sha256-row';

            const labelEl = document.createElement('span');
            labelEl.className = 'sha256-label';
            labelEl.textContent = label;
            row.appendChild(labelEl);

            const hashEl = document.createElement('span');
            hashEl.className = 'sha256-hash';
            [...hash].forEach((ch, i) => {
                const charSpan = document.createElement('span');
                charSpan.textContent = ch;
                if (compareHash[i] !== ch) {
                    charSpan.classList.add('highlight');
                }
                hashEl.appendChild(charSpan);
            });
            row.appendChild(hashEl);
            wrapper.appendChild(row);
        };

        renderRow('Your message:', hashA, hashB);
        renderRow('One bit flipped:', hashB, hashA);

        let diffCount = 0;
        for (let i = 0; i < hashA.length; i++) {
            if (hashA[i] !== hashB[i]) diffCount++;
        }
        const stat = document.createElement('div');
        stat.className = 'sha256-stat';
        stat.textContent = `${diffCount} of ${hashA.length} hex characters differ (≈${Math.round((diffCount / hashA.length) * 100)}%) from a single flipped bit.`;
        wrapper.appendChild(stat);

        container.appendChild(wrapper);
    },
});
