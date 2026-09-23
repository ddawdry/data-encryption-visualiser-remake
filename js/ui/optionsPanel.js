// Renders input fields for the active cipher's paramsSchema, and reports current values on change.
const optionsPanel = document.getElementById('optionsPanel');

/**
 * @param {import('../core/cipherRegistry.js').CipherModule} cipher
 * @param {(params: Object) => void} onChange
 */
export function render(cipher, onChange) {
    optionsPanel.replaceChildren();
    const values = {};

    cipher.paramsSchema.forEach((field) => {
        values[field.name] = field.default;

        const wrapper = document.createElement('div');
        wrapper.className = 'option-field';

        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = `option-${field.name}`;

        const input = document.createElement('input');
        input.type = field.type === 'number' ? 'number' : 'text';
        input.id = `option-${field.name}`;
        input.value = field.default;
        if (field.type === 'number') {
            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
        }
        if (field.type === 'text' && field.maxLength !== undefined) {
            input.maxLength = field.maxLength;
        }

        input.addEventListener('input', () => {
            values[field.name] = field.type === 'number' ? Number(input.value) : input.value;
            onChange({ ...values });
        });

        wrapper.append(label, input);
        optionsPanel.appendChild(wrapper);
    });

    onChange({ ...values });
}
