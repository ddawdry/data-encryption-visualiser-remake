// AES (Conceptual): a schematic walk-through of ONE AES round's four stages on a 4x4 block of 16
// letters — NOT real AES. Real AES operates on raw bytes using Galois-field (GF(2^8)) arithmetic
// and a full key schedule; this demo substitutes simpler, still-genuinely-invertible stand-ins so
// the STRUCTURE (four different kinds of operation, working together) is visible without requiring
// abstract algebra. Each simplification is noted below and in the description shown in the app.
//
// This file is dynamically imported (see app.js) rather than statically imported at startup,
// since it's one of the larger cipher modules — its id/name/category/description/paramsSchema
// below are DUPLICATED in app.js's lazy-cipher registration, so the picker can show it before
// this file has actually loaded. Keep both copies in sync if you change any of those fields.
import { register } from '../core/cipherRegistry.js';

const BLOCK_SIZE = 16;

// Stand-in "S-box": a fixed substitution table, not AES's real GF(2^8) multiplicative-inverse +
// affine transform. Reuses the same style of fixed permutation as the Substitution cipher.
const S_BOX_LETTERS = 'QWERTYUIOPASDFGHJKLZXCVBNM';

function letterToNum(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

function numToLetter(num) {
    return String.fromCharCode((((num % 26) + 26) % 26) + 65);
}

const FORWARD_S_BOX = [...S_BOX_LETTERS].map((ch) => letterToNum(ch));
const INVERSE_S_BOX = (() => {
    const inv = new Array(26);
    FORWARD_S_BOX.forEach((v, i) => {
        inv[v] = i;
    });
    return inv;
})();

function deriveRoundKey(rawKey) {
    const cleaned = (rawKey || 'KEY').toUpperCase().replace(/[^A-Z]/g, '') || 'KEY';
    const values = [];
    for (let i = 0; i < BLOCK_SIZE; i++) {
        values.push(letterToNum(cleaned[i % cleaned.length]));
    }
    return values;
}

// State is state[row][col], filled/read in AES's real column-major order.
function toState(values) {
    const state = [[], [], [], []];
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            state[row][col] = values[col * 4 + row];
        }
    }
    return state;
}

function fromState(state) {
    const values = [];
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            values.push(state[row][col]);
        }
    }
    return values;
}

function subBytes(state, inverse) {
    const table = inverse ? INVERSE_S_BOX : FORWARD_S_BOX;
    return state.map((row) => row.map((v) => table[v]));
}

// Real AES: row r shifts left by r. Faithful here, since it's pure rearrangement, not byte math.
function shiftRows(state, inverse) {
    return state.map((row, r) => {
        const shift = inverse ? (4 - r) % 4 : r;
        return row.map((_, c) => row[(c + shift) % 4]);
    });
}

// Simplified stand-in for AES's real GF(2^8) polynomial mixing: rotates each column by one
// position instead (down for the forward direction, up to invert it).
function mixColumnsSimplified(state, inverse) {
    const newState = [[], [], [], []];
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            const sourceRow = inverse ? (row + 1) % 4 : (row + 3) % 4;
            newState[row][col] = state[sourceRow][col];
        }
    }
    return newState;
}

// Real AES XORs with the round key; this uses mod-26 addition instead, for consistency with how
// every other letter-based cipher in this app combines a key (Vigenere, Hill, One-Time Pad).
function addRoundKey(state, roundKeyValues, inverse) {
    const keyState = toState(roundKeyValues);
    return state.map((row, r) => row.map((v, c) => {
        const k = keyState[r][c];
        return inverse ? (v - k + 26) % 26 : (v + k) % 26;
    }));
}

function runRound(values, roundKey, mode) {
    let state = toState(values);
    if (mode === 'encrypt') {
        state = subBytes(state, false);
        state = shiftRows(state, false);
        state = mixColumnsSimplified(state, false);
        state = addRoundKey(state, roundKey, false);
    } else {
        state = addRoundKey(state, roundKey, true);
        state = mixColumnsSimplified(state, true);
        state = shiftRows(state, true);
        state = subBytes(state, true);
    }
    return fromState(state);
}

function* aesSteps(text, params, mode) {
    const roundKey = deriveRoundKey(params.key);

    const letterIndices = [];
    for (let i = 0; i < text.length; i++) {
        if (/[a-zA-Z]/.test(text[i])) letterIndices.push(i);
    }

    const results = new Map();
    const fullBlockCount = Math.floor(letterIndices.length / BLOCK_SIZE);
    for (let b = 0; b < fullBlockCount; b++) {
        const blockIndices = letterIndices.slice(b * BLOCK_SIZE, (b + 1) * BLOCK_SIZE);
        const inputValues = blockIndices.map((idx) => letterToNum(text[idx]));
        const outputValues = runRound(inputValues, roundKey, mode);
        blockIndices.forEach((idx, pos) => {
            const row = pos % 4;
            const col = Math.floor(pos / 4);
            results.set(idx, { newChar: numToLetter(outputValues[pos]), row, col });
        });
    }

    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (results.has(i)) {
            const { newChar, row, col } = results.get(i);
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `AES round (simplified): '${oldChar.toUpperCase()}' → '${newChar}' (ends up at row ${row + 1}, column ${col + 1} of the 4x4 block) after SubBytes, ShiftRows, MixColumns, and AddRoundKey`,
            };
        } else if (/[a-zA-Z]/.test(oldChar)) {
            yield {
                index: i,
                oldChar,
                newChar: oldChar.toUpperCase(),
                explanation: `Not changing '${oldChar}' — a full AES block needs 16 letters, and this is a leftover`,
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
    for (const step of aesSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'aes',
    name: 'AES (Conceptual)',
    category: 'modern',
    description:
        'A simplified, schematic walk-through of ONE AES round on a 4x4 block of 16 letters — not real AES, which operates on raw bytes using Galois-field math and a far more complex key schedule. ' +
        'Shows the same four stages real AES uses: SubBytes (substitute each value via a fixed table), ShiftRows (cyclically shift each row), MixColumns (here, a simple column rotation standing in for AES’s real polynomial math), and AddRoundKey (combine with a round key). ' +
        'Letters are processed in blocks of 16; leftover letters that don’t fill a complete block are left unchanged. ' +
        'Security level: not applicable — this is for understanding structure, not a usable cipher. ' +
        'Best used for: seeing why AES needs several different kinds of operation working together, not just one.',
    paramsSchema: [
        { name: 'key', label: 'Round Key', type: 'text', default: 'KEY' },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: aesSteps,

    // Shows the 4x4 block progressing through each stage of the round that contains the current step.
    visualize(container, { text, params, mode, currentIndex }) {
        const letterIndices = [];
        for (let i = 0; i < text.length; i++) {
            if (/[a-zA-Z]/.test(text[i])) letterIndices.push(i);
        }
        if (letterIndices.length < BLOCK_SIZE) {
            return;
        }

        const fullBlockCount = Math.floor(letterIndices.length / BLOCK_SIZE);
        let block = 0;
        if (currentIndex !== null && currentIndex !== undefined) {
            const posInLetters = letterIndices.indexOf(currentIndex);
            if (posInLetters !== -1 && posInLetters < fullBlockCount * BLOCK_SIZE) {
                block = Math.floor(posInLetters / BLOCK_SIZE);
            }
        }

        const roundKey = deriveRoundKey(params.key);
        const blockIndices = letterIndices.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE);
        const inputValues = blockIndices.map((idx) => letterToNum(text[idx]));
        let state = toState(inputValues);

        const stages = [['Input', state]];
        if (mode === 'encrypt') {
            state = subBytes(state, false);
            stages.push(['After SubBytes', state]);
            state = shiftRows(state, false);
            stages.push(['After ShiftRows', state]);
            state = mixColumnsSimplified(state, false);
            stages.push(['After MixColumns', state]);
            state = addRoundKey(state, roundKey, false);
            stages.push(['After AddRoundKey', state]);
        } else {
            state = addRoundKey(state, roundKey, true);
            stages.push(['After Inv. AddRoundKey', state]);
            state = mixColumnsSimplified(state, true);
            stages.push(['After Inv. MixColumns', state]);
            state = shiftRows(state, true);
            stages.push(['After Inv. ShiftRows', state]);
            state = subBytes(state, true);
            stages.push(['After Inv. SubBytes', state]);
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'aes-stages';

        stages.forEach(([label, stageState]) => {
            const stageEl = document.createElement('div');
            stageEl.className = 'aes-stage';

            const title = document.createElement('div');
            title.className = 'aes-stage-label';
            title.textContent = label;
            stageEl.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'aes-grid';
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'aes-cell';
                    cell.textContent = numToLetter(stageState[row][col]);
                    grid.appendChild(cell);
                }
            }
            stageEl.appendChild(grid);
            wrapper.appendChild(stageEl);
        });

        container.appendChild(wrapper);
    },
});
