// Rail Fence: writes the text in a zigzag across N rails, then reads each rail off left to right.
// A transposition cipher — characters move position rather than changing value.
import { register } from '../core/cipherRegistry.js';

function assertValidRails(numRails) {
    if (!Number.isInteger(numRails) || numRails < 2) {
        throw new Error('Number of rails must be a whole number of 2 or more');
    }
}

// pattern[i] = which rail (0-indexed) position i sits on, for a zigzag of the given length.
function railPattern(length, numRails) {
    const pattern = [];
    let rail = 0;
    let direction = 1;
    for (let i = 0; i < length; i++) {
        pattern.push(rail);
        if (rail === 0) direction = 1;
        else if (rail === numRails - 1) direction = -1;
        rail += direction;
    }
    return pattern;
}

// order[outputPos] = sourceIndex: reading rail-by-rail gives this plaintext position next.
function computeOrder(length, numRails) {
    const pattern = railPattern(length, numRails);
    const order = [];
    for (let rail = 0; rail < numRails; rail++) {
        for (let i = 0; i < length; i++) {
            if (pattern[i] === rail) order.push(i);
        }
    }
    return order;
}

function invertOrder(order) {
    const inverse = new Array(order.length);
    order.forEach((sourceIndex, outputPos) => {
        inverse[sourceIndex] = outputPos;
    });
    return inverse;
}

function railFenceEncrypt(text, params) {
    const numRails = Number(params.rails);
    assertValidRails(numRails);
    return computeOrder(text.length, numRails)
        .map((sourceIndex) => text[sourceIndex])
        .join('');
}

function railFenceDecrypt(text, params) {
    const numRails = Number(params.rails);
    assertValidRails(numRails);
    const inverse = invertOrder(computeOrder(text.length, numRails));
    return inverse.map((sourceIndex) => text[sourceIndex]).join('');
}

register({
    id: 'railfence',
    name: 'Rail Fence',
    category: 'classical',
    description:
        'Writes your text in a zigzag down and up across a chosen number of rails, then reads each rail off left to right. ' +
        'Unlike the other classical ciphers here, it rearranges characters rather than changing them. ' +
        'Security level: weak (breakable by trying each rail count). Best used for: learning how transposition ciphers differ from substitution ciphers.',
    paramsSchema: [
        { name: 'rails', label: 'Number of Rails', type: 'number', min: 2, max: 10, default: 3 },
    ],

    encrypt: railFenceEncrypt,
    decrypt: railFenceDecrypt,

    *stepThrough(text, params, mode) {
        const numRails = Number(params.rails);
        assertValidRails(numRails);
        const length = text.length;
        const pattern = railPattern(length, numRails);
        const order = computeOrder(length, numRails);
        const inverse = mode === 'decrypt' ? invertOrder(order) : null;

        for (let i = 0; i < length; i++) {
            const oldChar = text[i];
            let newChar;
            let explanation;

            if (mode === 'encrypt') {
                const sourceIndex = order[i];
                newChar = text[sourceIndex];
                const rail = pattern[sourceIndex];
                explanation = `Rail Fence: Position ${i + 1} reads rail ${rail + 1} — the letter originally at position ${sourceIndex + 1} ('${newChar}')`;
            } else {
                const sourceIndex = inverse[i];
                newChar = text[sourceIndex];
                const rail = pattern[i];
                explanation = `Rail Fence: Position ${i + 1} (rail ${rail + 1}) was written from ciphertext position ${sourceIndex + 1} ('${newChar}')`;
            }

            yield { index: i, oldChar, newChar, explanation };
        }
    },

    // Shows the zigzag grid: columns are plaintext positions, rows are rails. Works out the same
    // way for both modes because `text` (whatever was typed in) is fully known from the start either way.
    visualize(container, { text, params, mode, currentIndex }) {
        const numRails = Number(params.rails);
        if (!Number.isInteger(numRails) || numRails < 2 || text.length === 0) {
            return;
        }

        const length = text.length;
        const pattern = railPattern(length, numRails);
        const order = computeOrder(length, numRails);
        const inverse = invertOrder(order);

        const highlightColumn = currentIndex === null || currentIndex === undefined
            ? -1
            : mode === 'encrypt' ? order[currentIndex] : currentIndex;

        const grid = document.createElement('div');
        grid.className = 'rail-fence-grid';
        grid.style.gridTemplateColumns = `repeat(${length}, 1.6em)`;
        grid.style.gridTemplateRows = `repeat(${numRails}, 1.6em)`;

        for (let rail = 0; rail < numRails; rail++) {
            for (let col = 0; col < length; col++) {
                const cell = document.createElement('div');
                cell.className = 'rail-fence-cell';
                if (pattern[col] === rail) {
                    cell.textContent = mode === 'encrypt' ? text[col] : text[inverse[col]];
                    if (col === highlightColumn) {
                        cell.classList.add('highlight');
                    }
                }
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);
    },
});
