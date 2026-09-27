// Encodes/decodes cipher + params + text to/from the URL query string, so the
// current setup can be shared or reloaded. Only the setup is shared, not the
// current step position — restoring mid-animation isn't in scope.

/**
 * @returns {{ cipherId: string|null, mode: 'encrypt'|'decrypt'|null, text: string|null, params: Object }}
 */
export function readState() {
    const query = new URLSearchParams(window.location.search);
    const mode = query.get('mode');

    const params = {};
    for (const [key, value] of query.entries()) {
        if (key.startsWith('p_')) {
            params[key.slice(2)] = value;
        }
    }

    return {
        cipherId: query.get('cipher') || null,
        mode: mode === 'encrypt' || mode === 'decrypt' ? mode : null,
        text: query.get('text') || null,
        params,
    };
}

/**
 * @param {{ cipherId: string|null, mode: string, text: string, params: Object }} state
 */
export function writeState({ cipherId, mode, text, params }) {
    const query = new URLSearchParams();
    if (cipherId) query.set('cipher', cipherId);
    if (mode) query.set('mode', mode);
    if (text) query.set('text', text);

    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(`p_${key}`, value);
        }
    });

    const search = query.toString();
    const newUrl = `${window.location.pathname}${search ? `?${search}` : ''}`;
    window.history.replaceState(null, '', newUrl);
}
