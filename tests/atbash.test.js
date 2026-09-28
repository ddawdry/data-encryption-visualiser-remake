import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/atbash.js';

const atbash = get('atbash');

test('mirrors letters and preserves case/non-letters', () => {
    assert.equal(atbash.encrypt('Hello, World!'), 'Svool, Dliow!');
});

test('A maps to Z and vice versa', () => {
    assert.equal(atbash.encrypt('AZaz'), 'ZAza');
});

test('applying it twice returns the original text (self-inverse)', () => {
    const original = 'The Quick Brown Fox, 42!';
    assert.equal(atbash.encrypt(atbash.encrypt(original)), original);
});

test('encrypt and decrypt are the same operation', () => {
    const text = 'Same both ways';
    assert.equal(atbash.encrypt(text), atbash.decrypt(text));
});

test('stepThrough yields one step per character with correct explanations', () => {
    const steps = [...atbash.stepThrough('Hi!')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: 'S',
        explanation: "Atbash: Mirroring 'H' to 'S'",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});
