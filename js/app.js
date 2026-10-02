// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import * as optionsPanel from './ui/optionsPanel.js';
import * as controls from './ui/controls.js';
import * as resultPanel from './ui/resultPanel.js';
import * as themeToggle from './ui/themeToggle.js';
import * as permalink from './ui/permalink.js';
import * as cipherVisualization from './ui/cipherVisualization.js';
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
import './ciphers/rsa.js';
import './ciphers/diffieHellman.js';
import './ciphers/aes.js';
import './ciphers/sha256.js';
import './ciphers/bruteForceCaesar.js';

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
    playTimer = setInterval(() => {
        handleNext();
        if (finished || !started) {
            stopPlaying();
        }
    }, stepDelayMs);
}

function startPlaying() {
    controls.setPlaying(true);
    handleNext(); // step immediately — setInterval alone would wait a full delay first
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

function startRun() {
    const text = textInput.value.trim();
    if (!text) {
        visualizer.showMessage('Heads up', `Please enter some text to ${activeMode}!`, { urgent: true });
        return false;
    }
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
    visualizer.showMessage(`${verb}ion Complete!`, `Original text: ${lastText} — New text: ${displayChars.join('')}`);
}

function handleNext() {
    try {
        if (!started || finished) {
            if (!startRun()) return;
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

function handleComplete() {
    stopPlaying();
    try {
        if (!started || finished) {
            if (!startRun()) return;
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
