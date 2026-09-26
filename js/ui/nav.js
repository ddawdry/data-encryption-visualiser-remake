// Cipher picker / navigation, driven by the cipher registry.
const cipherPicker = document.getElementById('cipherPicker');

const CATEGORY_LABELS = {
    classical: 'Classical',
    modern: 'Modern',
    analysis: 'Analysis',
};

let groupHeadingId = 0;

/**
 * @param {import('../core/cipherRegistry.js').CipherModule[]} ciphers
 * @param {(cipher: import('../core/cipherRegistry.js').CipherModule) => void} onSelect
 */
export function render(ciphers, onSelect) {
    cipherPicker.replaceChildren();

    const byCategory = new Map();
    ciphers.forEach((cipher) => {
        const group = byCategory.get(cipher.category) || [];
        group.push(cipher);
        byCategory.set(cipher.category, group);
    });

    let isFirst = true;
    byCategory.forEach((group, category) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'cipher-picker-group';

        const headingId = `cipher-picker-heading-${groupHeadingId++}`;
        const heading = document.createElement('h4');
        heading.className = 'cipher-picker-heading';
        heading.id = headingId;
        heading.textContent = CATEGORY_LABELS[category] || category;

        const buttonsEl = document.createElement('div');
        buttonsEl.className = 'cipher-picker-buttons';
        buttonsEl.setAttribute('role', 'group');
        buttonsEl.setAttribute('aria-labelledby', headingId);

        group.forEach((cipher) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cipher-btn';
            button.textContent = cipher.name;
            button.dataset.cipherId = cipher.id;
            button.setAttribute('aria-pressed', isFirst ? 'true' : 'false');
            if (isFirst) {
                button.classList.add('active');
                isFirst = false;
            }
            button.addEventListener('click', () => {
                setActive(button);
                onSelect(cipher);
            });
            buttonsEl.appendChild(button);
        });

        groupEl.append(heading, buttonsEl);
        cipherPicker.appendChild(groupEl);
    });
}

function setActive(activeButton) {
    cipherPicker.querySelectorAll('.cipher-btn').forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-pressed', 'true');
}
