import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/polybius.js';

const polybius = get('polybius');

test('A is row 1, column 1', () => {
    assert.equal(polybius.encrypt('A', {}), '11');
});

test('Z is row 5, column 5', () => {
    assert.equal(polybius.encrypt('Z', {}), '55');
});

test('I and J share a cell', () => {
    assert.equal(polybius.encrypt('I', {}), polybius.encrypt('J', {}));
});

test('encrypts a whole word, preserving punctuation', () => {
    // H=23 E=15 L=31 L=31 O=34
    assert.equal(polybius.encrypt('HELLO!', {}), '2315313134!');
});

test('encrypt then decrypt returns the original text (uppercased, J normalized to I)', () => {
    const original = 'HELLO, WORLD';
    assert.equal(polybius.decrypt(polybius.encrypt(original, {}), {}), original);
});

test('decrypt normalizes case to uppercase (no case information survives as digits)', () => {
    assert.equal(polybius.decrypt(polybius.encrypt('hello', {}), {}), 'HELLO');
});

test('decrypting a J coordinate gives back I', () => {
    const jCoords = polybius.encrypt('J', {});
    assert.equal(polybius.decrypt(jCoords, {}), 'I');
});

test('rejects an incomplete coordinate pair', () => {
    assert.throws(() => polybius.decrypt('11 1', {}), {
        message: "Found a digit that isn't part of a complete coordinate pair",
    });
});

test('rejects an out-of-range coordinate', () => {
    assert.throws(() => polybius.decrypt('99', {}), {
        message: "'99' isn't a valid coordinate (rows and columns are 1-5)",
    });
});

test('stepThrough in encrypt mode yields one step per input character', () => {
    const steps = [...polybius.stepThrough('HI!', {}, 'encrypt')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: '23',
        explanation: "Polybius Square: 'H' is in row 2, column 3 → '23'",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});

test('stepThrough in decrypt mode yields one step per input character, with the first digit of a pair producing no output', () => {
    const steps = [...polybius.stepThrough('23!', {}, 'decrypt')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: '2',
        newChar: '',
        explanation: "Reading row digit '2' — waiting for the column digit",
    });
    assert.deepEqual(steps[1], {
        index: 1,
        oldChar: '3',
        newChar: 'H',
        explanation: "Row 2, column 3 → 'H'",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not part of a coordinate",
    });
});

test('joining stepThrough output (encrypt) matches encrypt()', () => {
    const text = 'Attack At Dawn!';
    const steps = [...polybius.stepThrough(text, {}, 'encrypt')];
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), polybius.encrypt(text, {}));
});
