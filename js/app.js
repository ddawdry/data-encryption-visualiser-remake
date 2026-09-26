// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import * as optionsPanel from './ui/optionsPanel.js';
import * as controls from './ui/controls.js';
import * as resultPanel from './ui/resultPanel.js';
import * as themeToggle from './ui/themeToggle.js';
import './ciphers/caesar.js';
import './ciphers/vigenere.js';
import './ciphers/substitution.js';

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
        });
        modeSwitch.appendChild(button);
    });
}

function resetRun() {
    started = false;
    finished = false;
    displayChars = [];
    lastText = '';
    visualizer.clear();
    resultPanel.reset(activeMode);
}

function startRun() {
    const text = textInput.value.trim();
    if (!text) {
        visualizer.showMessage('Heads up', `Please enter some text to ${activeMode}!`);
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

        if (finished) {
            showCompletionMessage();
        }
    } catch (error) {
        visualizer.showMessage('Error', error.message);
    }
}

function handleComplete() {
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
        showCompletionMessage();
    } catch (error) {
        visualizer.showMessage('Error', error.message);
    }
}

function handleBack() {
    const step = stepEngine.back();
    if (!step) return;

    displayChars[step.index] = step.oldChar;
    finished = false;
    resultPanel.update(displayChars, stepEngine.getPosition() - 1, activeMode, false);
}

function selectCipher(cipher) {
    activeCipher = cipher;
    renderCipherInfo(cipher);
    resetRun();
    optionsPanel.render(cipher, (params) => {
        activeParams = params;
        resetRun();
    });
}

textInput.addEventListener('input', resetRun);
controls.render({ onBack: handleBack, onNext: handleNext, onComplete: handleComplete });
renderModeSwitch();
themeToggle.init();

const ciphers = list();
nav.render(ciphers, selectCipher);
selectCipher(ciphers[0]);
