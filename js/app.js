// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list, get, registerLazy } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import * as optionsPanel from './ui/optionsPanel.js';
import * as controls from './ui/controls.js';
import * as resultPanel from './ui/resultPanel.js';
import * as themeToggle from './ui/themeToggle.js';
import * as permalink from './ui/permalink.js';
import * as cipherVisualization from './ui/cipherVisualization.js';
import * as comparisonPanel from './ui/comparisonPanel.js';
import * as historyPanel from './ui/historyPanel.js';
import './ciphers/caesar.js';
import './ciphers/vigenere.js';
import './ciphers/substitution.js';
import './ciphers/rot13.js';
import './ciphers/atbash.js';
import './ciphers/railFence.js';
import './ciphers/polybius.js';
import './ciphers/playfair.js';
import './ciphers/hill.js';
import './ciphers/xor.js';
import './ciphers/onetimepad.js';
import './ciphers/encoding.js';
import './ciphers/diffieHellman.js';
import './ciphers/bruteForceCaesar.js';
import './ciphers/frequencyAnalysis.js';
import './ciphers/kasiski.js';

// RSA, AES, and SHA-256 are this app's three largest cipher modules (the heaviest math), so
// they're loaded on demand instead of upfront — nothing fetches/parses their code until the user
// actually selects one. Metadata here must stay in sync with each file's own register() call
// (each file has a comment pointing back here for exactly this reason).
const lazyLoaders = new Map();

function registerLazyCipher(meta, load) {
    lazyLoaders.set(meta.id, registerLazy(meta, load));
}

async function ensureCipherLoaded(cipherId) {
    const ensureLoaded = lazyLoaders.get(cipherId);
    if (ensureLoaded) await ensureLoaded();
}

registerLazyCipher(
    {
        id: 'rsa',
        name: 'RSA (Simplified)',
        category: 'modern',
        description:
            'Real asymmetric-key math — a public key anyone can encrypt with, and a separate private key only the ' +
            'recipient needs to decrypt — but with small primes instead of the huge ones real RSA needs for security. ' +
            "Each letter becomes a number via modular exponentiation (mᵉ mod n), so the ciphertext is a list of " +
            "space-separated numbers rather than letters; this demo only encrypts letters (not spaces or punctuation) " +
            'to keep those numbers unambiguous to read back apart. ' +
            'Security level: none at this size (these primes are small enough to factor by hand) — real RSA uses primes hundreds of digits long. ' +
            'Best used for: seeing how public-key cryptography actually works mathematically, not just that it exists.',
        paramsSchema: [
            { name: 'p', label: 'Prime p', type: 'number', min: 2, max: 97, default: 17 },
            { name: 'q', label: 'Prime q', type: 'number', min: 2, max: 97, default: 19 },
            { name: 'e', label: 'Public Exponent e', type: 'number', min: 2, max: 999, default: 5 },
        ],
    },
    () => import('./ciphers/rsa.js'),
);

registerLazyCipher(
    {
        id: 'aes',
        name: 'AES (Conceptual)',
        category: 'modern',
        description:
            'A simplified, schematic walk-through of ONE AES round on a 4x4 block of 16 letters — not real AES, which operates on raw bytes using Galois-field math and a far more complex key schedule. ' +
            'Shows the same four stages real AES uses: SubBytes (substitute each value via a fixed table), ShiftRows (cyclically shift each row), MixColumns (here, a simple column rotation standing in for AES’s real polynomial math), and AddRoundKey (combine with a round key). ' +
            'Letters are processed in blocks of 16; leftover letters that don’t fill a complete block are left unchanged. ' +
            'Security level: not applicable — this is for understanding structure, not a usable cipher. ' +
            'Best used for: seeing why AES needs several different kinds of operation working together, not just one.',
        paramsSchema: [
            { name: 'key', label: 'Round Key', type: 'text', default: 'KEY' },
        ],
    },
    () => import('./ciphers/aes.js'),
);

registerLazyCipher(
    {
        id: 'sha256',
        name: 'SHA-256 (Hash)',
        category: 'modern',
        description:
            'A cryptographic hash, not a cipher: there’s no key and no decrypt, because hashing only goes one way. ' +
            'Encrypt and Decrypt do the same thing here — compute the hash — since there’s nothing to reverse. ' +
            'The defining property is the avalanche effect: flipping even a single bit of the input changes roughly half the output bits, unpredictably (see the panel above for a live comparison). ' +
            'Hashes are used to verify data hasn’t changed (file checksums, password storage, blockchain), not to hide it — the output is always the same length regardless of input size, and the input generally can’t be recovered from it. ' +
            'Security level: not applicable in the encryption sense — SHA-256 itself is considered cryptographically strong for integrity checking. ' +
            'Best used for: seeing the avalanche effect and understanding why "hashing" and "encrypting" are different operations with different purposes.',
        paramsSchema: [],
    },
    () => import('./ciphers/sha256.js'),
);

const cipherInfo = document.getElementById('cipherInfo');
const textInput = document.getElementById('textInput');
const modeSwitch = document.getElementById('modeSwitch');

let activeCipher = null;
let activeParams = {};
let activeMode = 'encrypt';
let displayChars = [];
let lastText = '';
let started = false;
let finished = false;
let playTimer = null;
let stepDelayMs = 700;

const SPEED_DELAYS_MS = { 1: 1500, 2: 1000, 3: 700, 4: 400, 5: 200 };
const initialState = permalink.readState();

function syncPermalink() {
    permalink.writeState({
        cipherId: activeCipher ? activeCipher.id : null,
        mode: activeMode,
        text: textInput.value,
        params: activeParams,
    });
}

// Description panel driven entirely by module metadata — no per-cipher text lives here.
function renderCipherInfo(cipher) {
    cipherInfo.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = cipher.name;
    const paragraph = document.createElement('p');
    paragraph.textContent = cipher.description;
    cipherInfo.append(heading, paragraph);
}

function renderModeSwitch() {
    modeSwitch.replaceChildren();
    modeSwitch.setAttribute('role', 'group');
    modeSwitch.setAttribute('aria-label', 'Encrypt or decrypt');
    ['encrypt', 'decrypt'].forEach((mode) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'switch-btn';
        button.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        button.setAttribute('aria-pressed', mode === activeMode ? 'true' : 'false');
        if (mode === activeMode) button.classList.add('active');
        button.addEventListener('click', () => {
            if (mode === activeMode) return;
            activeMode = mode;
            modeSwitch.querySelectorAll('.switch-btn').forEach((btn) => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            resetRun();
            syncPermalink();
            updateComparison();
        });
        modeSwitch.appendChild(button);
    });
}

function stopPlaying() {
    if (playTimer !== null) {
        clearInterval(playTimer);
        playTimer = null;
        controls.setPlaying(false);
    }
}

function scheduleInterval() {
    playTimer = setInterval(async () => {
        await handleNext();
        if (finished || !started) {
            stopPlaying();
        }
    }, stepDelayMs);
}

async function startPlaying() {
    controls.setPlaying(true);
    await handleNext(); // step immediately — setInterval alone would wait a full delay first
    if (finished || !started) {
        stopPlaying();
        return;
    }
    scheduleInterval();
}

function handleTogglePlay() {
    if (playTimer !== null) {
        stopPlaying();
    } else {
        startPlaying();
    }
}

function handleSpeedChange(level) {
    stepDelayMs = SPEED_DELAYS_MS[level] ?? stepDelayMs;
    if (playTimer !== null) {
        clearInterval(playTimer);
        scheduleInterval(); // re-time only — no extra step from just adjusting speed
    }
}

function defaultParamsFor(cipher) {
    const params = {};
    cipher.paramsSchema.forEach((field) => {
        params[field.name] = field.default;
    });
    return params;
}

// Comparison mode shows a SECOND cipher's full result (its own default params, not a synced
// step-by-step animation) next to the main one — a full duplicate of the options/animation stack
// for a second cipher would be a much bigger feature than this needs to be.
async function updateComparison() {
    if (!comparisonPanel.isEnabled()) return;

    const comparisonCipher = ciphers.find((cipher) => cipher.id === comparisonPanel.getSelectedCipherId());
    if (!comparisonCipher) return;

    const text = textInput.value.trim();
    if (!text) {
        comparisonPanel.showResult(comparisonCipher.name, '(enter some text above)');
        return;
    }

    try {
        await ensureCipherLoaded(comparisonCipher.id);
        // Same stale-reference issue as startRun() above: re-fetch after awaiting the load.
        const freshCipher = get(comparisonCipher.id) || comparisonCipher;
        const params = defaultParamsFor(freshCipher);
        const result = activeMode === 'encrypt'
            ? freshCipher.encrypt(text, params)
            : freshCipher.decrypt(text, params);
        comparisonPanel.showResult(freshCipher.name, result);
    } catch (error) {
        comparisonPanel.showError(comparisonCipher.name, error.message);
    }
}

function updateCipherVisualization(currentIndex) {
    if (!activeCipher) return;
    cipherVisualization.render(activeCipher, {
        text: lastText,
        params: activeParams,
        mode: activeMode,
        currentIndex,
    });
}

function resetRun() {
    stopPlaying();
    started = false;
    finished = false;
    displayChars = [];
    lastText = '';
    visualizer.clear();
    resultPanel.reset(activeMode);
    cipherVisualization.clear();
}

async function startRun() {
    const text = textInput.value.trim();
    if (!text) {
        visualizer.showMessage('Heads up', `Please enter some text to ${activeMode}!`, { urgent: true });
        return false;
    }
    await ensureCipherLoaded(activeCipher.id);
    // The cipher this app holds a reference to (picked from the `ciphers` array built once at
    // bootstrap) may still be the lazy-loading stub even after the line above resolves — awaiting
    // ensureLoaded only guarantees the REGISTRY's entry was replaced, not this closure's own
    // variable. Re-fetch so the real encrypt/decrypt/stepThrough get used.
    activeCipher = get(activeCipher.id) || activeCipher;
    lastText = text;
    displayChars = text.split('');
    visualizer.clear();
    resultPanel.reset(activeMode);
    stepEngine.start(activeCipher, text, activeParams, activeMode);
    started = true;
    finished = false;
    return true;
}

function showCompletionMessage() {
    const verb = activeMode.charAt(0).toUpperCase() + activeMode.slice(1);
    const result = displayChars.join('');
    visualizer.showMessage(`${verb}ion Complete!`, `Original text: ${lastText} — New text: ${result}`);
    historyPanel.addEntry({
        cipherId: activeCipher.id,
        cipherName: activeCipher.name,
        mode: activeMode,
        text: lastText,
        params: activeParams,
        result,
    });
}

async function handleNext() {
    try {
        if (!started || finished) {
            if (!(await startRun())) return;
        }

        const step = stepEngine.next();
        if (step === null) return;

        displayChars[step.index] = step.newChar;
        visualizer.renderStep(step, stepEngine.getPosition(), activeMode);
        finished = stepEngine.getPosition() >= lastText.length;
        resultPanel.update(displayChars, step.index, activeMode, finished);
        updateCipherVisualization(step.index);

        if (finished) {
            showCompletionMessage();
        }
    } catch (error) {
        visualizer.showMessage('Error', error.message, { urgent: true });
    }
}

async function handleComplete() {
    stopPlaying();
    try {
        if (!started || finished) {
            if (!(await startRun())) return;
        }

        let step;
        while ((step = stepEngine.next()) !== null) {
            displayChars[step.index] = step.newChar;
        }

        finished = true;
        resultPanel.update(displayChars, lastText.length - 1, activeMode, true);
        updateCipherVisualization(lastText.length - 1);
        showCompletionMessage();
    } catch (error) {
        visualizer.showMessage('Error', error.message, { urgent: true });
    }
}

function handleBack() {
    stopPlaying();
    const step = stepEngine.back();
    if (!step) return;

    displayChars[step.index] = step.oldChar;
    finished = false;
    const position = stepEngine.getPosition();
    resultPanel.update(displayChars, position - 1, activeMode, false);
    updateCipherVisualization(position > 0 ? position - 1 : null);
}

function handleHistorySelect(entry) {
    const cipher = ciphers.find((c) => c.id === entry.cipherId);
    if (!cipher) return;

    activeMode = entry.mode;
    textInput.value = entry.text;
    renderModeSwitch();
    nav.render(ciphers, (c) => selectCipher(c), cipher.id);
    selectCipher(cipher, entry.params);
    syncPermalink();
    updateComparison();
}

function selectCipher(cipher, initialParams) {
    activeCipher = cipher;
    renderCipherInfo(cipher);
    resetRun();
    optionsPanel.render(cipher, (params) => {
        activeParams = params;
        resetRun();
        syncPermalink();
    }, initialParams);
}

textInput.addEventListener('input', () => {
    resetRun();
    syncPermalink();
    updateComparison();
});
controls.render({
    onBack: handleBack,
    onNext: handleNext,
    onComplete: handleComplete,
    onTogglePlay: handleTogglePlay,
    onSpeedChange: handleSpeedChange,
});

if (initialState.mode) {
    activeMode = initialState.mode;
}
if (initialState.text) {
    textInput.value = initialState.text;
}

renderModeSwitch();
themeToggle.init();

const ciphers = list();
const startingCipher = ciphers.find((cipher) => cipher.id === initialState.cipherId) || ciphers[0];
nav.render(ciphers, (cipher) => selectCipher(cipher), startingCipher.id);
selectCipher(startingCipher, initialState.params);

comparisonPanel.init(ciphers, {
    onToggle: updateComparison,
    onCipherChange: updateComparison,
});

historyPanel.init(handleHistorySelect);

// Offline support is a progressive enhancement — if registration fails (unsupported browser,
// non-secure context, etc.) the app still works online exactly as before.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
            console.warn('Service worker registration failed:', error);
        });
    });
}
