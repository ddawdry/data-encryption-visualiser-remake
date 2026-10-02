// Frequency analysis: a cryptanalysis tool for Substitution ciphers, not a cipher itself. A
// substitution swaps WHICH letter represents what, but can't hide HOW OFTEN each letter appears —
// if 'E' is the most common letter in the plaintext, whatever it got mapped to is the most common
// letter in the ciphertext too. Same shape as the brute-force Caesar breaker: no key (there's
// nothing to configure), 'analysis' category, Encrypt/Decrypt do the same thing, and the report
// only appears on the last step since it needs the whole sample.
import { register } from '../core/cipherRegistry.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Standard published English letter frequencies (percent), sums to ~99.8% due to source rounding.
const ENGLISH_FREQUENCIES = {
    E: 12.70, T: 9.06, A: 8.17, O: 7.51, I: 6.97, N: 6.75, S: 6.33, H: 6.09,
    R: 5.99, D: 4.25, L: 4.03, C: 2.78, U: 2.76, M: 2.41, W: 2.36, F: 2.23,
    G: 2.02, Y: 1.97, P: 1.93, B: 1.29, V: 0.98, K: 0.77, J: 0.15, X: 0.15,
    Q: 0.10, Z: 0.07,
};

function computeObservedFrequencies(text) {
    const counts = {};
    for (const ch of ALPHABET) counts[ch] = 0;

    let totalLetters = 0;
    for (const rawChar of text.toUpperCase()) {
        if (counts[rawChar] !== undefined) {
            counts[rawChar]++;
            totalLetters++;
        }
    }

    const frequencies = {};
    for (const ch of ALPHABET) {
        frequencies[ch] = totalLetters > 0 ? (counts[ch] / totalLetters) * 100 : 0;
    }
    return { frequencies, totalLetters };
}

// One step per input character, like every other cipher here, but the report only appears on the
// LAST step (every earlier step contributes ''), since frequencies need the whole sample — same
// zero-width-step technique as the brute-force Caesar breaker.
function* frequencySteps(text) {
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (i === text.length - 1) {
            const { frequencies, totalLetters } = computeObservedFrequencies(text);
            const report = ALPHABET.split('')
                .map((ch) => `${ch}: ${frequencies[ch].toFixed(1)}% (English: ${ENGLISH_FREQUENCIES[ch]}%)`)
                .join(' | ');
            yield {
                index: i,
                oldChar,
                newChar: report,
                explanation: `Counted ${totalLetters} letters — see the chart above comparing your text's frequencies to standard English`,
            };
        } else {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `'${oldChar}' added to the sample — frequencies are computed once the whole text is in`,
            };
        }
    }
}

function runFull(text) {
    const chars = text.split('');
    for (const step of frequencySteps(text)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'frequencyanalysis',
    name: 'Frequency Analysis',
    category: 'analysis',
    description:
        'Substitution ciphers swap each letter for another, but can’t hide how OFTEN each letter appears — if \'E\' is the most common letter in the plaintext, whatever it got mapped to is the most common letter in the ciphertext too. ' +
        'This tool counts your text’s letter frequencies and compares them to the known average for English (see the chart above), so you can start guessing which ciphertext letter stands for which real one. ' +
        'Works best on longer text — short samples don’t have enough letters for the pattern to show clearly. ' +
        'This is why Substitution, despite having over 400 undecillion possible keys, is still breakable by hand: key-space size doesn’t matter if the structure leaks information. ' +
        'Security level demonstrated: none for simple substitution against this technique. ' +
        'Best used for: understanding why "more possible keys" doesn’t automatically mean "more secure".',
    paramsSchema: [],

    encrypt(text) {
        return runFull(text);
    },
    decrypt(text) {
        return runFull(text);
    },
    stepThrough: frequencySteps,

    // A bar chart comparing the typed text's letter frequencies against the standard English
    // baseline, recomputed from whatever text is currently typed in.
    visualize(container, { text }) {
        const { frequencies, totalLetters } = computeObservedFrequencies(text);
        if (totalLetters === 0) return;

        const maxValue = Math.max(
            ...ALPHABET.split('').map((ch) => Math.max(frequencies[ch], ENGLISH_FREQUENCIES[ch])),
            1,
        );

        const wrapper = document.createElement('div');
        wrapper.className = 'freq-chart';

        const legend = document.createElement('div');
        legend.className = 'freq-legend';
        [
            ['freq-observed', 'Your text'],
            ['freq-baseline', 'English average'],
        ].forEach(([swatchClass, label]) => {
            const item = document.createElement('span');
            item.className = 'freq-legend-item';
            const swatch = document.createElement('span');
            swatch.className = `freq-swatch ${swatchClass}`;
            item.append(swatch, document.createTextNode(label));
            legend.appendChild(item);
        });
        wrapper.appendChild(legend);

        const bars = document.createElement('div');
        bars.className = 'freq-bars';

        ALPHABET.split('').forEach((ch) => {
            const col = document.createElement('div');
            col.className = 'freq-col';

            const barPair = document.createElement('div');
            barPair.className = 'freq-bar-pair';

            const observedBar = document.createElement('div');
            observedBar.className = 'freq-bar freq-observed';
            observedBar.style.height = `${(frequencies[ch] / maxValue) * 100}%`;
            observedBar.title = `${ch}: ${frequencies[ch].toFixed(1)}% in your text`;

            const baselineBar = document.createElement('div');
            baselineBar.className = 'freq-bar freq-baseline';
            baselineBar.style.height = `${(ENGLISH_FREQUENCIES[ch] / maxValue) * 100}%`;
            baselineBar.title = `${ch}: ${ENGLISH_FREQUENCIES[ch]}% in standard English`;

            barPair.append(observedBar, baselineBar);

            const label = document.createElement('div');
            label.className = 'freq-letter-label';
            label.textContent = ch;

            col.append(barPair, label);
            bars.appendChild(col);
        });

        wrapper.appendChild(bars);
        container.appendChild(wrapper);
    },
});
