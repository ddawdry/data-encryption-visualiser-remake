// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import * as optionsPanel from './ui/optionsPanel.js';
import './ciphers/caesar.js';
import './ciphers/vigenere.js';
import './ciphers/substitution.js';

const cipherInfo = document.getElementById('cipherInfo');

let activeCipher = null;
let activeParams = {};

// Description panel driven entirely by module metadata — no per-cipher text lives here.
function renderCipherInfo(cipher) {
    cipherInfo.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = cipher.name;
    const paragraph = document.createElement('p');
    paragraph.textContent = cipher.description;
    cipherInfo.append(heading, paragraph);
}

// Runs the active cipher against a fixed demo string — proves registry ->
// stepEngine -> visualizer wiring. Real text input arrives once controls.js
// and the text field are wired up in a later checkpoint.
function runDemo() {
    if (!activeCipher) return;
    visualizer.clear();
    stepEngine.start(activeCipher, 'hi', activeParams, 'encrypt');

    let stepNumber = 0;
    try {
        let step;
        while ((step = stepEngine.next()) !== null) {
            stepNumber++;
            visualizer.renderStep(step, stepNumber, 'encrypt');
        }
    } catch (error) {
        visualizer.showMessage('Error', error.message);
    }
}

function selectCipher(cipher) {
    activeCipher = cipher;
    renderCipherInfo(cipher);
    optionsPanel.render(cipher, (params) => {
        activeParams = params;
        runDemo();
    });
}

const ciphers = list();
nav.render(ciphers, selectCipher);
selectCipher(ciphers[0]);
