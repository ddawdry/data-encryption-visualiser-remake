// Simplified RSA: real asymmetric-key math (public/private key pair) with small, manageable primes
// instead of the astronomically large ones real RSA needs for security.
//
// Unlike every cipher before this one, a letter's ciphertext is a NUMBER of variable width (e.g.
// '7' vs '243'), not a fixed number of digits — so Polybius/Hex's fixed-pair-width decrypt parsing
// doesn't apply. Numbers are separated by spaces in the output instead, and decrypt scans for
// runs of digits as tokens. To keep that parsing unambiguous, non-letter characters (including
// spaces you typed) aren't preserved in the ciphertext — they contribute nothing to the result,
// same "zero-width step" technique Polybius/Base64 use, just for a different reason here.
import { register } from '../core/cipherRegistry.js';

function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

function modInverse(a, m) {
    const normalized = ((a % m) + m) % m;
    for (let x = 1; x < m; x++) {
        if ((normalized * x) % m === 1) return x;
    }
    return null;
}

function modPow(base, exponent, modulus) {
    if (modulus === 1) return 0;
    let result = 1;
    let b = base % modulus;
    let e = exponent;
    while (e > 0) {
        if (e % 2 === 1) {
            result = (result * b) % modulus;
        }
        e = Math.floor(e / 2);
        b = (b * b) % modulus;
    }
    return result;
}

function isPrime(n) {
    if (!Number.isInteger(n) || n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
    }
    return true;
}

function letterToNum(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

function numToLetter(num) {
    return String.fromCharCode(num + 65);
}

function deriveKeys(params) {
    const p = Number(params.p);
    const q = Number(params.q);
    const e = Number(params.e);

    if (!isPrime(p) || !isPrime(q)) {
        throw new Error('p and q must both be prime numbers');
    }
    if (p === q) {
        throw new Error('p and q must be different primes');
    }

    const n = p * q;
    const totient = (p - 1) * (q - 1);

    if (n <= 25) {
        throw new Error('p × q must be greater than 25 so every letter A-Z fits in the message space');
    }
    if (!Number.isInteger(e) || e <= 1 || e >= totient || gcd(e, totient) !== 1) {
        throw new Error(`Public exponent e must be between 2 and ${totient - 1} and share no common factor with ${totient}`);
    }

    const d = modInverse(e, totient);
    return { p, q, n, totient, e, d };
}

function* rsaSteps(text, params, mode) {
    const { n, e, d } = deriveKeys(params);

    if (mode === 'encrypt') {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const m = letterToNum(oldChar);
                const c = modPow(m, e, n);
                yield {
                    index: i,
                    oldChar,
                    newChar: `${c} `,
                    explanation: `RSA: '${oldChar.toUpperCase()}' = ${m}. ${m}^${e} mod ${n} → ${c} (encrypted with the public key)`,
                };
            } else {
                yield {
                    index: i,
                    oldChar,
                    newChar: '',
                    explanation: `Not included in the ciphertext: '${oldChar}' — this demo only encrypts letters`,
                };
            }
        }
        return;
    }

    let i = 0;
    while (i < text.length) {
        if (/\d/.test(text[i])) {
            const start = i;
            while (i < text.length && /\d/.test(text[i])) i++;
            const token = text.slice(start, i);
            const c = Number(token);
            const m = modPow(c, d, n);
            if (m < 0 || m > 25) {
                throw new Error(`'${token}' doesn't decode to a letter — check it was encrypted with the matching public key`);
            }
            const newChar = numToLetter(m);
            yield {
                index: start,
                oldChar: text[start],
                newChar,
                explanation: `RSA: ${token}^${d} mod ${n} → ${m} = '${newChar}' (decrypted with the private key)`,
            };
            for (let j = start + 1; j < i; j++) {
                yield {
                    index: j,
                    oldChar: text[j],
                    newChar: '',
                    explanation: `Part of the number '${token}', already decoded above`,
                };
            }
        } else {
            yield {
                index: i,
                oldChar: text[i],
                newChar: '',
                explanation: `Not changing '${text[i]}' — not part of an RSA number`,
            };
            i++;
        }
    }
}

function runFull(text, params, mode) {
    const chars = text.split('');
    for (const step of rsaSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('').trim();
}

register({
    id: 'rsa',
    name: 'RSA (Simplified)',
    category: 'modern',
    description:
        'Real asymmetric-key math — a public key anyone can encrypt with, and a separate private key only the ' +
        'recipient needs to decrypt — but with small primes instead of the huge ones real RSA needs for security. ' +
        "Each letter becomes a number via modular exponentiation (mᵉ mod n), so the ciphertext is a list of " +
        "space-separated numbers rather than letters; this demo only encrypts letters (not spaces or punctuation) " +
        'to keep those numbers unambiguous to read back apart. ' +
        'Security level: none at this size (these primes are small enough to factor by hand) — real RSA uses primes hundreds of digits long. ' +
        'Best used for: seeing how public-key cryptography actually works mathematically, not just that it exists.',
    paramsSchema: [
        { name: 'p', label: 'Prime p', type: 'number', min: 2, max: 97, default: 17 },
        { name: 'q', label: 'Prime q', type: 'number', min: 2, max: 97, default: 19 },
        { name: 'e', label: 'Public Exponent e', type: 'number', min: 2, max: 999, default: 5 },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: rsaSteps,

    // Shows the derived key pair — this is the "key generation" half of the checkpoint; the
    // modular exponentiation for each letter is already shown in the step explanation above.
    visualize(container, { params, mode }) {
        let keys;
        try {
            keys = deriveKeys(params);
        } catch {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'rsa-keys';

        const rows = [
            ['n = p × q', `${keys.p} × ${keys.q} = ${keys.n}`],
            ['φ(n) = (p−1)(q−1)', `${keys.p - 1} × ${keys.q - 1} = ${keys.totient}`],
            ['Public key (e, n)', `(${keys.e}, ${keys.n})`],
            ['Private key (d, n)', `(${keys.d}, ${keys.n})`],
        ];

        rows.forEach(([label, value]) => {
            const row = document.createElement('div');
            row.className = 'rsa-key-row';
            const labelEl = document.createElement('span');
            labelEl.className = 'rsa-key-label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'rsa-key-value';
            valueEl.textContent = value;
            row.append(labelEl, valueEl);
            wrapper.appendChild(row);
        });

        const activeKeyNote = document.createElement('div');
        activeKeyNote.className = 'rsa-active-key';
        activeKeyNote.textContent = mode === 'encrypt'
            ? `Encrypting with the PUBLIC key (${keys.e}, ${keys.n})`
            : `Decrypting with the PRIVATE key (${keys.d}, ${keys.n})`;
        wrapper.appendChild(activeKeyNote);

        container.appendChild(wrapper);
    },
});
