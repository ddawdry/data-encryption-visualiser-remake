// Light/dark theme toggle: follows the OS preference until the user picks explicitly,
// then that choice is remembered via [data-theme] on <html> + localStorage.
const STORAGE_KEY = 'theme';
const button = document.getElementById('themeToggle');
const media = window.matchMedia('(prefers-color-scheme: dark)');

function systemPrefersDark() {
    return media.matches;
}

function currentTheme() {
    return document.documentElement.dataset.theme || (systemPrefersDark() ? 'dark' : 'light');
}

function updateButton(theme) {
    const isDark = theme === 'dark';
    button.textContent = isDark ? '☀️' : '🌙';
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

export function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
        document.documentElement.dataset.theme = stored;
    }
    updateButton(currentTheme());

    button.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.dataset.theme = next;
        updateButton(next);
    });

    // Keep the icon accurate if the OS theme changes while no explicit choice is stored.
    media.addEventListener('change', () => {
        if (!document.documentElement.dataset.theme) {
            updateButton(currentTheme());
        }
    });
}
