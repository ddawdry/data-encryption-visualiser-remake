// Bootstraps the app: wires nav, cipher registry, and step engine together.
import { register, list } from './core/cipherRegistry.js';
import * as stepEngine from './core/stepEngine.js';
import * as visualizer from './ui/visualizer.js';
import * as nav from './ui/nav.js';

// Dummy cipher, replaced by real ones in M3 — proves the registry, step engine,
// history stack, and visualizer are wired together correctly before that.
const noopCipher = {
    id: 'noop',
    name: 'No-op (sanity check)',
    category: 'debug',
    description: 'Passes text through unchanged — verifies the wiring works before real ciphers are ported in.',
    paramsSchema: [],
    encrypt(text) {
        return text;
    },
    decrypt(text) {
        return text;
    },
    *stepThrough(text) {
        for (let i = 0; i < text.length; i++) {
            yield {
                index: i,
                oldChar: text[i],
                newChar: text[i],
                explanation: `No-op: '${text[i]}' passed through unchanged`,
            };
        }
    },
};

register(noopCipher);

function runSanityCheck(cipher) {
    visualizer.clear();
    stepEngine.start(cipher, 'hi', {}, 'encrypt');

    let step;
    let stepNumber = 0;
    while ((step = stepEngine.next()) !== null) {
        stepNumber++;
        visualizer.renderStep(step, stepNumber, 'encrypt');
    }
}

nav.render(list(), runSanityCheck);
runSanityCheck(noopCipher);
