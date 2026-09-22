// Cipher picker / navigation, driven by the cipher registry.
const cipherPicker = document.getElementById('cipherPicker');

/**
 * @param {import('../core/cipherRegistry.js').CipherModule[]} ciphers
 * @param {(cipher: import('../core/cipherRegistry.js').CipherModule) => void} onSelect
 */
export function render(ciphers, onSelect) {
    cipherPicker.replaceChildren();

    ciphers.forEach((cipher, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cipher-btn';
        button.textContent = cipher.name;
        button.dataset.cipherId = cipher.id;
        if (index === 0) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            setActive(button);
            onSelect(cipher);
        });
        cipherPicker.appendChild(button);
    });
}

function setActive(activeButton) {
    cipherPicker.querySelectorAll('.cipher-btn').forEach((btn) => btn.classList.remove('active'));
    activeButton.classList.add('active');
}
