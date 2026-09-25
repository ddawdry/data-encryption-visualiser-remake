import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/caesar.js';

const caesar = get('caesar');

test('encrypt then decrypt returns the original text', () => {
    const original = 'Hello, World!';
    const params = { shift: 3 };
    const encrypted = caesar.encrypt(original, params);
    const decrypted = caesar.decrypt(encrypted, params);
    assert.equal(decrypted, original);
});

test('encrypt shifts letters and preserves case', () => {
    assert.equal(caesar.encrypt('Hello, World!', { shift: 3 }), 'Khoor, Zruog!');
});

test('wraps around the end of the alphabet', () => {
    assert.equal(caesar.encrypt('xyz', { shift: 3 }), 'abc');
});

test('non-letters are left unchanged', () => {
    assert.equal(caesar.encrypt('Hello, World! 123', { shift: 3 }), 'Khoor, Zruog! 123');
});

test('stepThrough yields one step per character with correct explanations', () => {
    const steps = [...caesar.stepThrough('Hi!', { shift: 3 }, 'encrypt')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: 'K',
        explanation: "Caesar Cipher: Moving 'H' forward by 3 letters",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});
