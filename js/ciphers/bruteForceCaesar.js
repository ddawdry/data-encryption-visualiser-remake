// Brute-force Caesar breaker: a cryptanalysis tool, not a cipher — there's no key to configure,
// since the whole point is you don't know it. Caesar only has 25 possible shifts, so trying all of
// them and reading the results is a complete, practical attack; no statistics needed (that's
// checkpoint 47's frequency analysis, for Substitution's much larger key space instead).
// Encrypt and Decrypt do the same thing here (same precedent as SHA-256) — there's no meaningful
// "direction" for an attack that just enumerates every possibility.
import { register } from '../core/cipherRegistry.js';

function shiftLetter(char, shift) {
    if (!/[a-zA-Z]/.test(char)) return char;
    const base = char === char.toLowerCase() ? 97 : 65;
    const code = char.charCodeAt(0) - base;
    const shifted = ((code + shift) % 26 + 26) % 26;
    return String.fromCharCode(shifted + base);
}

function tryAllShifts(text) {
    const attempts = [];
    for (let shift = 1; shift <= 25; shift++) {
        const candidate = [...text].map((ch) => shiftLetter(ch, -shift)).join('');
        attempts.push({ shift, candidate });
    }
    return attempts;
}

// One step per input character, like every other cipher here, but the actual report only appears
// on the LAST step (every earlier step contributes ''), since brute-forcing needs the whole
// ciphertext — same zero-width-step technique as Polybius/Base64/RSA/SHA-256.
function* bruteForceSteps(text) {
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (i === text.length - 1) {
            const attempts = tryAllShifts(text);
            const report = attempts.map(({ shift, candidate }) => `Shift ${shift}: ${candidate}`).join(' | ');
            yield {
                index: i,
                oldChar,
                newChar: report,
                explanation: 'Tried all 25 possible shifts — see the list above to spot which one reads as English',
            };
        } else {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `'${oldChar}' added to the ciphertext — brute force runs once the whole thing is in`,
            };
        }
    }
}

function runFull(text) {
    const chars = text.split('');
    for (const step of bruteForceSteps(text)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'bruteforcecaesar',
    name: 'Brute-Force Caesar Breaker',
    category: 'analysis',
    description:
        'Caesar cipher only has 25 possible shifts — far too few for real security. ' +
        'This tool tries all of them on your text and lists every result (see the panel above), so you can just read through and spot which one looks like actual English. No statistics needed. ' +
        'This is exactly why Caesar (and any cipher with a small key space) is considered broken: an attacker doesn’t need to guess the key, just try every possibility and recognize the right one. ' +
        'Security level: none — trivially broken by exhaustive search. ' +
        'Best used for: seeing exactly how a brute-force attack works, in the simplest possible case.',
    paramsSchema: [],

    encrypt(text) {
        return runFull(text);
    },
    decrypt(text) {
        return runFull(text);
    },
    stepThrough: bruteForceSteps,

    // All 25 shift attempts, listed clearly — recomputed from whatever text is currently typed in.
    visualize(container, { text }) {
        if (!text) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'brute-force-list';

        tryAllShifts(text).forEach(({ shift, candidate }) => {
            const row = document.createElement('div');
            row.className = 'brute-force-row';

            const label = document.createElement('span');
            label.className = 'brute-force-shift';
            label.textContent = `Shift ${shift}:`;

            const value = document.createElement('span');
            value.className = 'brute-force-candidate';
            value.textContent = candidate;

            row.append(label, value);
            wrapper.appendChild(row);
        });

        container.appendChild(wrapper);
    },
});
