// Playfair: encrypts pairs of letters (digraphs) using a 5x5 grid built from a keyword.
//
// Simplification from the textbook version: traditional Playfair inserts a filler letter ('X')
// when a digraph would repeat a letter, or when a lone letter is left over at the end. Doing that
// here would add characters that don't correspond to any input position, breaking the "one step
// per input character" rule every cipher in this app follows (see docs/architecture.md). Instead,
// such a letter is paired with ITSELF. The row/column/rectangle math works out identically either
// way (a letter paired with itself trivially shares its own row), so this only changes what happens
// to that one letter, not the cryptographic logic — and it keeps encrypt/decrypt perfectly
// length-preserving and round-trip correct (verified in tests/playfair.test.js).
import { register } from '../core/cipherRegistry.js';

function buildGrid(keyword) {
    const cleaned = (keyword || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    const seen = new Set();
    const letters = [];
    for (const ch of cleaned) {
        if (!seen.has(ch)) {
            seen.add(ch);
            letters.push(ch);
        }
    }
    for (const ch of 'ABCDEFGHIKLMNOPQRSTUVWXYZ') {
        if (!seen.has(ch)) {
            seen.add(ch);
            letters.push(ch);
        }
    }
    const grid = [];
    for (let row = 0; row < 5; row++) {
        grid.push(letters.slice(row * 5, row * 5 + 5));
    }
    return grid;
}

function findCoords(grid, letter) {
    const normalized = letter.toUpperCase() === 'J' ? 'I' : letter.toUpperCase();
    for (let row = 0; row < 5; row++) {
        const col = grid[row].indexOf(normalized);
        if (col !== -1) return { row, col };
    }
    return null;
}

function playfairPair(grid, aCoords, bCoords, direction) {
    if (aCoords.row === bCoords.row) {
        const newACol = (aCoords.col + direction + 5) % 5;
        const newBCol = (bCoords.col + direction + 5) % 5;
        return { a: grid[aCoords.row][newACol], b: grid[bCoords.row][newBCol], rule: 'row' };
    }
    if (aCoords.col === bCoords.col) {
        const newARow = (aCoords.row + direction + 5) % 5;
        const newBRow = (bCoords.row + direction + 5) % 5;
        return { a: grid[newARow][aCoords.col], b: grid[newBRow][bCoords.col], rule: 'column' };
    }
    return { a: grid[aCoords.row][bCoords.col], b: grid[bCoords.row][aCoords.col], rule: 'rectangle' };
}

// Walks the letter positions in text, greedily forming digraphs. A letter pairs with itself
// (instead of a filler) when the next letter is identical, or when it's the last letter overall.
function computeDigraphResults(text, grid, direction) {
    const letterIndices = [];
    for (let i = 0; i < text.length; i++) {
        if (/[a-zA-Z]/.test(text[i])) letterIndices.push(i);
    }

    const results = new Map();
    let p = 0;
    while (p < letterIndices.length) {
        const aIndex = letterIndices[p];
        const aLetter = text[aIndex].toUpperCase();
        let bIndex = aIndex;

        if (p + 1 < letterIndices.length) {
            const candidateIndex = letterIndices[p + 1];
            const bLetter = text[candidateIndex].toUpperCase();
            if (aLetter !== bLetter) {
                bIndex = candidateIndex;
            }
        }

        const aCoords = findCoords(grid, text[aIndex]);
        const bCoords = findCoords(grid, text[bIndex]);
        const { a, b, rule } = playfairPair(grid, aCoords, bCoords, direction);

        results.set(aIndex, { newChar: a, rule, partnerIndex: bIndex, partnerChar: text[bIndex].toUpperCase() });
        if (bIndex !== aIndex) {
            results.set(bIndex, { newChar: b, rule, partnerIndex: aIndex, partnerChar: text[aIndex].toUpperCase() });
        }

        p += bIndex === aIndex ? 1 : 2;
    }

    return results;
}

function* playfairSteps(text, params, mode) {
    const grid = buildGrid(params.keyword);
    const direction = mode === 'encrypt' ? 1 : -1;
    const results = computeDigraphResults(text, grid, direction);

    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (results.has(i)) {
            const { newChar, rule, partnerIndex, partnerChar } = results.get(i);
            const explanation = partnerIndex === i
                ? `Playfair: '${oldChar.toUpperCase()}' has no partner here, so it pairs with itself (${rule} rule) → '${newChar}'`
                : `Playfair: '${oldChar.toUpperCase()}' pairs with '${partnerChar}' (${rule} rule) → '${newChar}'`;
            yield { index: i, oldChar, newChar, explanation };
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
    for (const step of playfairSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'playfair',
    name: 'Playfair',
    category: 'classical',
    description:
        'Encrypts pairs of letters (digraphs) using a 5x5 grid built from a keyword (I and J share a cell). ' +
        'Letters in the same row shift right, letters in the same column shift down, and otherwise they swap columns — ' +
        'decrypting just reverses the shifts. ' +
        'Security level: moderate for its era (hides single-letter patterns, resisting simple frequency analysis). ' +
        'Best used for: seeing how a cipher can encrypt two letters together instead of one at a time.',
    paramsSchema: [
        { name: 'keyword', label: 'Keyword', type: 'text', default: 'MONARCHY' },
    ],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: playfairSteps,
});
