// Renders input fields for the active cipher's paramsSchema, and reports current values on change.
const optionsPanel = document.getElementById('optionsPanel');

function castValue(field, rawValue) {
    return field.type === 'number' ? Number(rawValue) : rawValue;
}

/**
 * @param {import('../core/cipherRegistry.js').CipherModule} cipher
 * @param {(params: Object) => void} onChange
 * @param {Object} [initialValues] - overrides a field's default, e.g. restored from a permalink
 */
export function render(cipher, onChange, initialValues = {}) {
    optionsPanel.replaceChildren();
    const values = {};

    cipher.paramsSchema.forEach((field) => {
        const initial = initialValues[field.name] !== undefined ? castValue(field, initialValues[field.name]) : field.default;
        values[field.name] = initial;

        const wrapper = document.createElement('div');
        wrapper.className = 'option-field';

        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = `option-${field.name}`;

        const input = document.createElement('input');
        input.type = field.type === 'number' ? 'number' : 'text';
        input.id = `option-${field.name}`;
        input.value = initial;
        if (field.type === 'number') {
            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
        }
        if (field.type === 'text' && field.maxLength !== undefined) {
            input.maxLength = field.maxLength;
        }

        input.addEventListener('input', () => {
            values[field.name] = castValue(field, input.value);
            onChange({ ...values });
        });

        wrapper.append(label, input);
        optionsPanel.appendChild(wrapper);
    });

    onChange({ ...values });
}
