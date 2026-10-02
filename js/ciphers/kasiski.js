// Kasiski examination: a cryptanalysis tool for Vigenere, not a cipher. Finds repeated 3-letter
// sequences in the ciphertext; the distance between two occurrences of the same sequence is
// usually a multiple of the key length (since the same plaintext fragment, encrypted with the same
// stretch of the repeating key, produces identical ciphertext). Same shape as the other analysis
// tools: no key, 'analysis' category, Encrypt/Decrypt do the same thing, report only on the last step.
//
// Distances are measured in ABSOLUTE TEXT POSITION (not letter-only count), matching how this
// app's own vigenere.js cycles its key index — see docs/architecture.md's note on that. Measuring
// in letter-only position would give a systematically wrong estimate for ciphertext this app
// actually produces from text containing spaces or punctuation.
import { register } from '../core/cipherRegistry.js';

function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

function factorsOf(n) {
    const factors = [];
    for (let f = 2; f <= n; f++) {
        if (n % f === 0) factors.push(f);
    }
    return factors;
}

function findRepeatedSequences(text, seqLength) {
    const upper = text.toUpperCase();
    const seen = new Map();
    for (let i = 0; i + seqLength <= upper.length; i++) {
        const seq = upper.slice(i, i + seqLength);
        if (!/^[A-Z]+$/.test(seq)) continue; // skip windows that span a non-letter
        if (!seen.has(seq)) seen.set(seq, []);
        seen.get(seq).push(i);
    }
    const repeats = [];
    for (const [seq, positions] of seen) {
        if (positions.length >= 2) repeats.push({ seq, positions });
    }
    return repeats;
}

function analyzeKeyLength(text) {
    const repeats = findRepeatedSequences(text, 3);
    const distances = [];
    const highlightPositions = new Set();

    repeats.forEach(({ seq, positions }) => {
        positions.forEach((pos) => {
            for (let k = 0; k < seq.length; k++) highlightPositions.add(pos + k);
        });
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                distances.push(positions[j] - positions[i]);
            }
        }
    });

    const overallGcd = distances.length > 0 ? distances.reduce((a, b) => gcd(a, b)) : null;
    const likelyFactors = overallGcd ? factorsOf(overallGcd) : [];

    return { repeats, distances, overallGcd, likelyFactors, highlightPositions };
}

function buildReport(analysis) {
    if (analysis.repeats.length === 0) {
        return 'No repeated 3-letter sequences found — try a longer message.';
    }
    const distancesText = analysis.distances.join(', ');
    const factorsText = analysis.likelyFactors.length > 0 ? analysis.likelyFactors.join(', ') : 'none found';
    return `Distances between repeats: ${distancesText} | GCD: ${analysis.overallGcd} | Likely key length is one of its factors: ${factorsText}`;
}

// One step per input character, like every other cipher here, but the report only appears on the
// LAST step (every earlier step contributes ''), since the examination needs the whole ciphertext.
function* kasiskiSteps(text) {
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (i === text.length - 1) {
            const analysis = analyzeKeyLength(text);
            yield {
                index: i,
                oldChar,
                newChar: buildReport(analysis),
                explanation: analysis.repeats.length > 0
                    ? `Found ${analysis.repeats.length} repeated sequence(s) — see the highlighted text and key-length candidates above`
                    : 'No repeated sequences found in this text — try a longer sample',
            };
        } else {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `'${oldChar}' added to the sample — Kasiski examination runs once the whole text is in`,
            };
        }
    }
}

function runFull(text) {
    const chars = text.split('');
    for (const step of kasiskiSteps(text)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'kasiski',
    name: 'Kasiski Examination',
    category: 'analysis',
    description:
        'Looks for repeated 3-letter sequences in Vigenere ciphertext. When the same plaintext fragment lines up with the same stretch of the repeating key twice, it produces identical ciphertext both times — ' +
        'and the distance between those two occurrences is a multiple of the key length. ' +
        'The GCD of all such distances narrows down the possible key lengths (shown as a list of candidates above, since one distance alone often can’t tell factors like 2, 5, and 10 apart — that’s a real limitation of this technique, not a bug). ' +
        'Works best on longer ciphertext with a short key, since that’s what makes coincidental alignment likely. ' +
        'Security level demonstrated: this is why a short, reused Vigenere key is breakable — once you know the key length, each position becomes its own simple Caesar shift. ' +
        'Best used for: seeing how classical cryptanalysis narrows down a key before any brute-forcing even starts.',
    paramsSchema: [],

    encrypt(text) {
        return runFull(text);
    },
    decrypt(text) {
        return runFull(text);
    },
    stepThrough: kasiskiSteps,

    // Highlights every occurrence of a repeated sequence in the typed text, plus the distance and
    // key-length-candidate breakdown.
    visualize(container, { text }) {
        if (!text) return;
        const analysis = analyzeKeyLength(text);

        const wrapper = document.createElement('div');
        wrapper.className = 'kasiski-panel';

        const textDisplay = document.createElement('div');
        textDisplay.className = 'kasiski-text';
        [...text].forEach((ch, i) => {
            if (analysis.highlightPositions.has(i)) {
                const span = document.createElement('span');
                span.className = 'highlight';
                span.textContent = ch;
                textDisplay.appendChild(span);
            } else {
                textDisplay.appendChild(document.createTextNode(ch));
            }
        });
        wrapper.appendChild(textDisplay);

        const summary = document.createElement('div');
        summary.className = 'kasiski-summary';
        if (analysis.repeats.length === 0) {
            summary.textContent = 'No repeated 3-letter sequences found yet — try a longer message.';
        } else {
            const distancesLine = document.createElement('div');
            distancesLine.textContent = `Distances between repeats: ${analysis.distances.join(', ')} (GCD: ${analysis.overallGcd})`;
            summary.appendChild(distancesLine);

            const guessLine = document.createElement('div');
            guessLine.className = 'kasiski-guess';
            guessLine.textContent = `Likely key length is one of: ${analysis.likelyFactors.join(', ')}`;
            summary.appendChild(guessLine);
        }
        wrapper.appendChild(summary);

        container.appendChild(wrapper);
    },
});
