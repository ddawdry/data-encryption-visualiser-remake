// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import * as optionsPanel from './ui/optionsPanel.js';
import './ciphers/caesar.js';
import './ciphers/vigenere.js';

let activeCipher = null;
let activeParams = {};

// Runs the active cipher against a fixed demo string — proves registry ->
// stepEngine -> visualizer wiring. Real text input arrives once controls.js
// and the text field are wired up in a later checkpoint.
function runDemo() {
    if (!activeCipher) return;
    visualizer.clear();
    stepEngine.start(activeCipher, 'hi', activeParams, 'encrypt');

    let step;
    let stepNumber = 0;
    while ((step = stepEngine.next()) !== null) {
        stepNumber++;
        visualizer.renderStep(step, stepNumber, 'encrypt');
    }
}

function selectCipher(cipher) {
    activeCipher = cipher;
    optionsPanel.render(cipher, (params) => {
        activeParams = params;
        runDemo();
    });
}

const ciphers = list();
nav.render(ciphers, selectCipher);
selectCipher(ciphers[0]);
