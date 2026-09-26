// Renders step-through animation (char-block diff view).
const animationDisplay = document.getElementById('animationDisplay');
const stepExplanation = document.getElementById('stepExplanation');

/**
 * @param {import('../core/cipherRegistry.js').CipherStep} step
 * @param {number} stepNumber
 * @param {'encrypt'|'decrypt'} mode
 */
export function renderStep(step, stepNumber, mode) {
    const charBlock = document.createElement('div');
    charBlock.className = 'char-block';
    if (step.oldChar !== step.newChar) {
        charBlock.classList.add('changed');
    }
    charBlock.textContent = `${step.oldChar} → ${step.newChar}`;
    animationDisplay.appendChild(charBlock);

    const verb = mode.charAt(0).toUpperCase() + mode.slice(1);
    showMessage(`${verb}ion Step ${stepNumber}`, step.explanation);
}

/**
 * @param {string} heading
 * @param {string} message
 * @param {{ urgent?: boolean }} [options] - urgent uses role="alert" (interrupts) instead of "status" (polite)
 */
export function showMessage(heading, message, { urgent = false } = {}) {
    stepExplanation.hidden = false;
    stepExplanation.setAttribute('role', urgent ? 'alert' : 'status');
    stepExplanation.replaceChildren();

    const h4 = document.createElement('h4');
    h4.textContent = heading;
    const p = document.createElement('p');
    p.textContent = message;
    stepExplanation.append(h4, p);
}

export function clear() {
    animationDisplay.replaceChildren();
    stepExplanation.hidden = true;
    stepExplanation.replaceChildren();
}
