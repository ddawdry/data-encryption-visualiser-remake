// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';
import './ciphers/caesar.js';

function defaultParams(cipher) {
    const params = {};
    for (const field of cipher.paramsSchema) {
        params[field.name] = field.default;
    }
    return params;
}

// Runs a cipher against a fixed demo string using its default params — proves
// registry -> stepEngine -> visualizer wiring. Real text/param input arrives
// once controls.js and the options panel are wired up in later checkpoints.
function runDemo(cipher) {
    visualizer.clear();
    stepEngine.start(cipher, 'hi', defaultParams(cipher), 'encrypt');

    let step;
    let stepNumber = 0;
    while ((step = stepEngine.next()) !== null) {
        stepNumber++;
        visualizer.renderStep(step, stepNumber, 'encrypt');
    }
}

const ciphers = list();
nav.render(ciphers, runDemo);
runDemo(ciphers[0]);
