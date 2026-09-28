import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/rot13.js';

const rot13 = get('rot13');

test('matches the classic example and preserves case/non-letters', () => {
    assert.equal(rot13.encrypt('Hello, World!'), 'Uryyb, Jbeyq!');
});

test('applying it twice returns the original text (self-inverse)', () => {
    const original = 'The Quick Brown Fox, 42!';
    assert.equal(rot13.encrypt(rot13.encrypt(original)), original);
});

test('encrypt and decrypt are the same operation', () => {
    const text = 'Same both ways';
    assert.equal(rot13.encrypt(text), rot13.decrypt(text));
});

test('stepThrough yields one step per character with correct explanations', () => {
    const steps = [...rot13.stepThrough('Hi!')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: 'U',
        explanation: "ROT13: Rotating 'H' by 13 letters",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});
