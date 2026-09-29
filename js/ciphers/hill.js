// Hill Cipher: encrypts pairs of letters via 2x2 matrix multiplication mod 26.
//
// Like Playfair, textbook Hill pads an odd leftover letter with a filler to complete the final
// pair. That would add a character with no input position, breaking this app's "one step per
// input character" rule (see docs/architecture.md) — and unlike Playfair, there's no clean
// "pair it with itself" trick here, since the matrix's two outputs for a self-paired vector are
// generally different numbers, and only one of them could ever be written to the single real
// position. So a lone leftover letter is simply left unchanged instead.
import { register } from '../core/cipherRegistry.js';

function mod(n, m) {
    return ((n % m) + m) % m;
}

function modInverse(a, m) {
    const normalized = mod(a, m);
    for (let x = 1; x < m; x++) {
        if (mod(normalized * x, m) === 1) return x;
    }
    return null;
}

function assertValidMatrix(matrix) {
    const values = matrix.flat();
    if (!values.every(Number.isInteger)) {
        throw new Error('Matrix values must be whole numbers');
    }
}

function invertMatrix(matrix) {
    const [[a, b], [c, d]] = matrix;
    const determinant = mod(a * d - b * c, 26);
    const detInverse = modInverse(determinant, 26);
    if (detInverse === null) {
        throw new Error('This matrix has no inverse mod 26 — its determinant must share no common factor with 26');
    }
    return [
        [mod(detInverse * d, 26), mod(detInverse * -b, 26)],
        [mod(detInverse * -c, 26), mod(detInverse * a, 26)],
    ];
}

function letterToNum(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

function numToLetter(num) {
    return String.fromCharCode(mod(num, 26) + 65);
}

// Maps each letter position that's part of a complete pair to its result + partner. A lone
// leftover letter (odd letter count) is simply absent from the returned map.
function computeHillResults(text, matrix) {
    const letterIndices = [];
    for (let i = 0; i < text.length; i++) {
        if (/[a-zA-Z]/.test(text[i])) letterIndices.push(i);
    }

    const results = new Map();
    for (let p = 0; p + 1 < letterIndices.length; p += 2) {
        const aIndex = letterIndices[p];
        const bIndex = letterIndices[p + 1];
        const p1 = letterToNum(text[aIndex]);
        const p2 = letterToNum(text[bIndex]);
        const c1 = numToLetter(matrix[0][0] * p1 + matrix[0][1] * p2);
        const c2 = numToLetter(matrix[1][0] * p1 + matrix[1][1] * p2);

        results.set(aIndex, { newChar: c1, partnerIndex: bIndex, partnerChar: text[bIndex].toUpperCase() });
        results.set(bIndex, { newChar: c2, partnerIndex: aIndex, partnerChar: text[aIndex].toUpperCase() });
    }
    return results;
}

function keyMatrixFromParams(params) {
    const matrix = [
        [Number(params.a), Number(params.b)],
        [Number(params.c), Number(params.d)],
    ];
    assertValidMatrix(matrix);
    return matrix;
}

function activeMatrixForMode(params, mode) {
    const keyMatrix = keyMatrixFromParams(params);
    const inverse = invertMatrix(keyMatrix); // validates invertibility regardless of mode
    return mode === 'encrypt' ? keyMatrix : inverse;
}

function* hillSteps(text, params, mode) {
    const matrix = activeMatrixForMode(params, mode);
    const results = computeHillResults(text, matrix);

    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (results.has(i)) {
            const { newChar, partnerChar } = results.get(i);
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `Hill Cipher: '${oldChar.toUpperCase()}' and '${partnerChar}' go through the matrix together → '${newChar}'`,
            };
        } else if (/[a-zA-Z]/.test(oldChar)) {
            yield {
                index: i,
                oldChar,
                newChar: oldChar.toUpperCase(),
                explanation: `Not changing '${oldChar}' — it's a lone leftover letter with no pair`,
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
    for (const step of hillSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'hill',
    name: 'Hill Cipher',
    category: 'classical',
    description:
        'Encrypts pairs of letters using 2x2 matrix multiplication (mod 26) — real linear algebra instead of a grid lookup. ' +
        'The key matrix must be invertible mod 26 (its determinant must share no common factor with 26) for decryption to work. ' +
        "A lone leftover letter at the end of odd-length text is left unchanged rather than padded, to keep the text's length exactly as typed. " +
        'Security level: resists simple frequency analysis, but breakable with a known-plaintext attack. ' +
        'Best used for: seeing how real matrix math can power a cipher.',
    paramsSchema: [
        { name: 'a', label: 'Matrix a', type: 'number', min: 0, max: 25, default: 3 },
        { name: 'b', label: 'Matrix b', type: 'number', min: 0, max: 25, default: 3 },
        { name: 'c', label: 'Matrix c', type: 'number', min: 0, max: 25, default: 2 },
        { name: 'd', label: 'Matrix d', type: 'number', min: 0, max: 25, default: 5 },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: hillSteps,

    // Shows the active matrix (the key for encrypt, its inverse for decrypt) and, once a pair has
    // been resolved, the input letters alongside the output letters it produced.
    visualize(container, { text, params, mode, currentIndex }) {
        let matrix;
        try {
            matrix = activeMatrixForMode(params, mode);
        } catch {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'hill-viz';

        const matrixGrid = document.createElement('div');
        matrixGrid.className = 'hill-matrix';
        matrix.flat().forEach((value) => {
            const cell = document.createElement('div');
            cell.className = 'hill-cell';
            cell.textContent = value;
            matrixGrid.appendChild(cell);
        });
        wrapper.appendChild(matrixGrid);

        const results = computeHillResults(text, matrix);
        const current = currentIndex !== null && currentIndex !== undefined ? results.get(currentIndex) : undefined;

        if (current) {
            const aIndex = Math.min(currentIndex, current.partnerIndex);
            const bIndex = Math.max(currentIndex, current.partnerIndex);

            const inputVec = document.createElement('div');
            inputVec.className = 'hill-vector';
            [text[aIndex], text[bIndex]].forEach((ch) => {
                const cell = document.createElement('div');
                cell.className = 'hill-cell highlight';
                cell.textContent = ch.toUpperCase();
                inputVec.appendChild(cell);
            });

            const outputVec = document.createElement('div');
            outputVec.className = 'hill-vector';
            [results.get(aIndex).newChar, results.get(bIndex).newChar].forEach((ch) => {
                const cell = document.createElement('div');
                cell.className = 'hill-cell highlight';
                cell.textContent = ch;
                outputVec.appendChild(cell);
            });

            wrapper.append(inputVec, outputVec);
        }

        container.appendChild(wrapper);
    },
});
