// Renders the transformed-text result box and progress text.
const resultBox = document.getElementById('resultBox');
const progressInfo = document.getElementById('progressInfo');

export function reset(mode) {
    resultBox.textContent = 'Results will show here';
    progressInfo.textContent = `Ready to ${mode}!`;
}

/**
 * @param {string[]} chars
 * @param {number} highlightIndex - index to highlight, or -1 for none
 * @param {'encrypt'|'decrypt'} mode
 * @param {boolean} done
 */
export function update(chars, highlightIndex, mode, done) {
    resultBox.replaceChildren();
    chars.forEach((char, index) => {
        if (index === highlightIndex) {
            const span = document.createElement('span');
            span.className = 'highlight';
            span.textContent = char;
            resultBox.appendChild(span);
        } else {
            resultBox.appendChild(document.createTextNode(char));
        }
    });

    const verb = mode.charAt(0).toUpperCase() + mode.slice(1);
    progressInfo.textContent = done ? `${verb}ion all done!` : `Step ${highlightIndex + 1} of ${chars.length}`;
}
