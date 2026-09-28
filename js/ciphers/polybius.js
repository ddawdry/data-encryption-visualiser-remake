// Polybius Square: encodes each letter as (row, column) coordinates in a 5x5 grid.
// Unlike every other cipher here, one input letter maps to TWO output digits (encrypt) and vice
// versa (decrypt) — so this still yields one step per character of the INPUT text (matching every
// other cipher's step count), but a step's contribution to the result can be 0, 1, or 2 characters
// wide. displayChars (sized to the input length, per app.js) handles that fine since each slot just
// holds a string, not necessarily a single character.
import { register } from '../core/cipherRegistry.js';

const SQUARE = [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'K'], // I and J share a cell — 26 letters don't fit a 5x5 (25-cell) grid
    ['L', 'M', 'N', 'O', 'P'],
    ['Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z'],
];

function letterToCoords(letter) {
    const normalized = letter.toUpperCase() === 'J' ? 'I' : letter.toUpperCase();
    for (let row = 0; row < 5; row++) {
        const col = SQUARE[row].indexOf(normalized);
        if (col !== -1) return { row, col };
    }
    return null;
}

function coordsToLetter(row, col) {
    return SQUARE[row]?.[col];
}

// Pre-scans decrypt input to classify each position: a digit is either the first or second half of
// a coordinate pair (pairs are always two consecutive digits); anything else just passes through.
function classifyDecryptPositions(text) {
    const roles = new Array(text.length);
    let i = 0;
    while (i < text.length) {
        if (/\d/.test(text[i])) {
            if (i + 1 >= text.length || !/\d/.test(text[i + 1])) {
                throw new Error("Found a digit that isn't part of a complete coordinate pair");
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

function* polybiusSteps(text, params, mode) {
    if (mode === 'encrypt') {
        for (let i = 0; i < text.length; i++) {
            const oldChar = text[i];
            if (/[a-zA-Z]/.test(oldChar)) {
                const { row, col } = letterToCoords(oldChar);
                const newChar = `${row + 1}${col + 1}`;
                yield {
                    index: i,
                    oldChar,
                    newChar,
                    explanation: `Polybius Square: '${oldChar.toUpperCase()}' is in row ${row + 1}, column ${col + 1} → '${newChar}'`,
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
        return;
    }

    const roles = classifyDecryptPositions(text);
    for (let i = 0; i < text.length; i++) {
        const oldChar = text[i];
        if (roles[i] === 'passthrough') {
            yield {
                index: i,
                oldChar,
                newChar: oldChar,
                explanation: `Not changing '${oldChar}' because it's not part of a coordinate`,
            };
        } else if (roles[i] === 'first') {
            yield {
                index: i,
                oldChar,
                newChar: '',
                explanation: `Reading row digit '${oldChar}' — waiting for the column digit`,
            };
        } else {
            const row = Number(text[i - 1]) - 1;
            const col = Number(oldChar) - 1;
            if (row < 0 || row > 4 || col < 0 || col > 4) {
                throw new Error(`'${text[i - 1]}${oldChar}' isn't a valid coordinate (rows and columns are 1-5)`);
            }
            const newChar = coordsToLetter(row, col);
            yield {
                index: i,
                oldChar,
                newChar,
                explanation: `Row ${row + 1}, column ${col + 1} → '${newChar}'`,
            };
        }
    }
}

function runFull(text, params, mode) {
    const chars = text.split('');
    for (const step of polybiusSteps(text, params, mode)) {
        chars[step.index] = step.newChar;
    }
    return chars.join('');
}

register({
    id: 'polybius',
    name: 'Polybius Square',
    category: 'classical',
    description:
        'Encodes each letter as its row and column in a 5x5 grid of the alphabet — I and J share a cell since ' +
        "26 letters don't fit 25 cells. Example: A is row 1, column 1, so it becomes '11'. " +
        'Note: encrypting literal digit characters can make the ciphertext ambiguous to decrypt back (a known limitation of this cipher without separators). ' +
        'Security level: weak (a fixed, known grid). Best used for: seeing how a cipher can turn letters into coordinate pairs instead of other letters.',
    paramsSchema: [],

    encrypt(text, params) {
        return runFull(text, params, 'encrypt');
    },
    decrypt(text, params) {
        return runFull(text, params, 'decrypt');
    },
    stepThrough: polybiusSteps,

    // Highlights the current letter's cell in the 5x5 grid.
    visualize(container, { text, mode, currentIndex }) {
        let highlightRow = -1;
        let highlightCol = -1;

        if (currentIndex !== null && currentIndex !== undefined && text[currentIndex] !== undefined) {
            if (mode === 'encrypt') {
                const ch = text[currentIndex];
                if (/[a-zA-Z]/.test(ch)) {
                    const coords = letterToCoords(ch);
                    if (coords) {
                        highlightRow = coords.row;
                        highlightCol = coords.col;
                    }
                }
            } else {
                const prev = text[currentIndex - 1];
                const curr = text[currentIndex];
                if (prev !== undefined && /\d/.test(prev) && /\d/.test(curr)) {
                    const row = Number(prev) - 1;
                    const col = Number(curr) - 1;
                    if (row >= 0 && row <= 4 && col >= 0 && col <= 4) {
                        highlightRow = row;
                        highlightCol = col;
                    }
                }
            }
        }

        const grid = document.createElement('div');
        grid.className = 'polybius-grid';

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'polybius-cell';
                cell.textContent = SQUARE[row][col];
                if (row === highlightRow && col === highlightCol) {
                    cell.classList.add('highlight');
                }
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);
    },
});
