// Session history: records completed runs in sessionStorage (cleared when the tab closes, unlike
// the shareable permalink which is meant to persist) and lets you click one to reload its setup.
const STORAGE_KEY = 'sessionHistory';
const MAX_ENTRIES = 20;
const TRUNCATE_LENGTH = 30;

const container = document.getElementById('historyPanel');
let onSelectHandler = null;

function truncate(text) {
    return text.length > TRUNCATE_LENGTH ? `${text.slice(0, TRUNCATE_LENGTH)}…` : text;
}

function loadEntries() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveEntries(entries) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // sessionStorage unavailable (private browsing, quota, etc.) — history just won't persist
    }
}

function render() {
    const entries = loadEntries();
    container.replaceChildren();

    if (entries.length === 0) {
        container.hidden = true;
        return;
    }
    container.hidden = false;

    const heading = document.createElement('h3');
    heading.textContent = 'Session History';
    container.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'history-list';

    entries.forEach((entry) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-entry';
        const verb = entry.mode.charAt(0).toUpperCase() + entry.mode.slice(1);
        button.textContent = `${entry.cipherName} (${verb}): "${truncate(entry.text)}" → "${truncate(entry.result)}"`;
        button.addEventListener('click', () => {
            onSelectHandler?.(entry);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        item.appendChild(button);
        list.appendChild(item);
    });
    container.appendChild(list);

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'history-clear';
    clearButton.textContent = 'Clear history';
    clearButton.addEventListener('click', () => {
        saveEntries([]);
        render();
    });
    container.appendChild(clearButton);
}

/** @param {(entry: { cipherId: string, mode: string, text: string, params: Object }) => void} onSelect */
export function init(onSelect) {
    onSelectHandler = onSelect;
    render();
}

export function addEntry({ cipherId, cipherName, mode, text, params, result }) {
    const entries = loadEntries();
    entries.unshift({ cipherId, cipherName, mode, text, params, result, at: Date.now() });
    entries.length = Math.min(entries.length, MAX_ENTRIES);
    saveEntries(entries);
    render();
}
