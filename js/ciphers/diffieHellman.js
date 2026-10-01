// Diffie-Hellman key exchange: NOT itself an encryption algorithm — a protocol for two parties
// (Alice and Bob) to agree on a shared secret over a public channel, without ever transmitting the
// secret itself. That doesn't fit the "transform this text" contract every other cipher here
// follows, so the exchange itself lives entirely in the visualize() panel below (always fully
// shown, same approach as RSA's key-generation panel). The shared secret it produces is then used
// as an ordinary Caesar shift on your message, which is what key exchange is actually *for* in
// practice — and it's what keeps stepThrough perfectly consistent with every other cipher's
// one-step-per-character model, with zero special-casing needed anywhere else in the app.
import { register } from '../core/cipherRegistry.js';

function isPrime(n) {
    if (!Number.isInteger(n) || n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
        if (n % i === 0) return false;
    }
    return true;
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

function shiftLetter(char, shift) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    const shifted = ((code + shift) % 26 + 26) % 26;
    return String.fromCharCode(shifted + base);
}

function deriveExchange(params) {
    const p = Number(params.p);
    const g = Number(params.g);
    const a = Number(params.a);
    const b = Number(params.b);

    if (!isPrime(p)) {
        throw new Error('p must be a prime number');
    }
    if (!Number.isInteger(g) || g < 2 || g >= p) {
        throw new Error(`g must be a whole number between 2 and ${p - 1}`);
    }
    if (!Number.isInteger(a) || a < 1 || a >= p - 1) {
        throw new Error(`Alice's private key must be a whole number between 1 and ${p - 2}`);
    }
    if (!Number.isInteger(b) || b < 1 || b >= p - 1) {
        throw new Error(`Bob's private key must be a whole number between 1 and ${p - 2}`);
    }

    const publicA = modPow(g, a, p);
    const publicB = modPow(g, b, p);
    const sharedSecret = modPow(publicB, a, p);

    return { p, g, a, b, publicA, publicB, sharedSecret };
}

function* dhSteps(text, params, mode) {
    const { sharedSecret } = deriveExchange(params);
    const shift = sharedSecret % 26;

    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (/[a-zA-Z]/.test(oldChar)) {
            const direction = mode === 'encrypt' ? shift : -shift;
            const newChar = shiftLetter(oldChar, direction);
            const verb = mode === 'encrypt' ? 'forward' : 'backward';
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `Using the shared secret (${sharedSecret} mod 26 = ${shift}) as a Caesar shift: moving '${oldChar}' ${verb} by ${shift}`,
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
}

function runFull(text, params, mode) {
    const chars = text.split('');
    for (const step of dhSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'diffiehellman',
    name: 'Diffie-Hellman',
    category: 'modern',
    description:
        'Lets two parties (Alice and Bob) agree on a shared secret over a public channel, without ever transmitting the secret itself — ' +
        'the basis for how most real encrypted connections establish a key in the first place. ' +
        'Each side picks a private key, exchanges a publicly-computed value, and combines the OTHER person’s public value with their OWN private key — both arrive at the same shared secret, shown in the panel above, while an eavesdropper only ever sees the public values. ' +
        'This demo then uses that shared secret as a Caesar shift on your message, to show what the key exchange is actually for. ' +
        'Security level: none at this size (small numbers make the underlying discrete-logarithm problem trivial) — real Diffie-Hellman uses numbers hundreds of digits long. ' +
        'Best used for: understanding how two people can agree on a secret in full view of an eavesdropper.',
    paramsSchema: [
        { name: 'p', label: 'Prime p', type: 'number', min: 5, max: 97, default: 23 },
        { name: 'g', label: 'Generator g', type: 'number', min: 2, max: 96, default: 5 },
        { name: 'a', label: "Alice's Private Key", type: 'number', min: 1, max: 95, default: 6 },
        { name: 'b', label: "Bob's Private Key", type: 'number', min: 1, max: 95, default: 15 },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: dhSteps,

    // The two-party exchange itself — always fully shown, since the protocol completes instantly
    // regardless of which message character is currently being stepped through.
    visualize(container, { params }) {
        let exchange;
        try {
            exchange = deriveExchange(params);
        } catch {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'dh-exchange';

        const publicInfo = document.createElement('div');
        publicInfo.className = 'dh-public-info';
        publicInfo.textContent = `Public, known to everyone (including eavesdroppers): p = ${exchange.p}, g = ${exchange.g}`;
        wrapper.appendChild(publicInfo);

        const parties = document.createElement('div');
        parties.className = 'dh-parties';

        const makeParty = (name, privateKey, publicValue) => {
            const party = document.createElement('div');
            party.className = 'dh-party';
            const title = document.createElement('div');
            title.className = 'dh-party-name';
            title.textContent = name;
            const priv = document.createElement('div');
            priv.textContent = `Private key: ${privateKey}`;
            const pub = document.createElement('div');
            pub.textContent = `Public value: g^${privateKey} mod ${exchange.p} = ${publicValue}`;
            const shared = document.createElement('div');
            shared.className = 'dh-shared';
            shared.textContent = `Shared secret: ${exchange.sharedSecret}`;
            party.append(title, priv, pub, shared);
            return party;
        };

        parties.append(
            makeParty('Alice', exchange.a, exchange.publicA),
            makeParty('Bob', exchange.b, exchange.publicB),
        );
        wrapper.appendChild(parties);

        const exchangeArrow = document.createElement('div');
        exchangeArrow.className = 'dh-arrow';
        exchangeArrow.textContent = `Alice sends ${exchange.publicA} ↔ Bob sends ${exchange.publicB} (over the public channel)`;
        wrapper.appendChild(exchangeArrow);

        container.appendChild(wrapper);
    },
});
