// Lets the user compare the active cipher's result against a second cipher, side by side. Shows
// the second cipher's full result (using its default params, not a synced step-by-step animation)
// — a full duplicate of the options/animation/controls stack for a second cipher would be a much
// bigger feature than this checkpoint calls for.
const toggle = document.getElementById('compareToggle');
const controls = document.getElementById('comparisonControls');
const select = document.getElementById('comparisonCipherSelect');
const resultEl = document.getElementById('comparisonResult');

/**
 * @param {import('../core/cipherRegistry.js').CipherModule[]} ciphers
 * @param {{ onToggle: (enabled: boolean) => void, onCipherChange: (cipherId: string) => void }} handlers
 */
export function init(ciphers, { onToggle, onCipherChange }) {
    select.replaceChildren();
    ciphers.forEach((cipher) => {
        const option = document.createElement('option');
        option.value = cipher.id;
        option.textContent = cipher.name;
        select.appendChild(option);
    });

    toggle.addEventListener('change', () => {
        controls.hidden = !toggle.checked;
        onToggle(toggle.checked);
    });

    select.addEventListener('change', () => {
        onCipherChange(select.value);
    });
}

export function isEnabled() {
    return toggle.checked;
}

export function getSelectedCipherId() {
    return select.value;
}

export function showResult(cipherName, text) {
    resultEl.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${cipherName}: `;
    resultEl.append(heading, document.createTextNode(text));
}

export function showError(cipherName, message) {
    resultEl.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${cipherName}: `;
    const errorSpan = document.createElement('span');
    errorSpan.className = 'comparison-error';
    errorSpan.textContent = message;
    resultEl.append(heading, errorSpan);
}
