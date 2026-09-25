import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/vigenere.js';

const vigenere = get('vigenere');

test('matches the classic textbook example (no spaces)', () => {
    assert.equal(vigenere.encrypt('ATTACKATDAWN', { keyword: 'LEMON' }), 'LXFOPVEFRNHR');
});

test('encrypt then decrypt returns the original text, punctuation and all', () => {
    const original = 'Attack at dawn!';
    const params = { keyword: 'LEMON' };
    const encrypted = vigenere.encrypt(original, params);
    const decrypted = vigenere.decrypt(encrypted, params);
    assert.equal(decrypted, original);
});

test('preserves case', () => {
    assert.equal(vigenere.encrypt('Hello', { keyword: 'KEY' }), 'Rijvs');
});

test('empty or letter-less keyword falls back to KEY', () => {
    assert.equal(vigenere.encrypt('hello', { keyword: '' }), vigenere.encrypt('hello', { keyword: 'KEY' }));
    assert.equal(vigenere.encrypt('hello', { keyword: '123' }), vigenere.encrypt('hello', { keyword: 'KEY' }));
});

// See docs/architecture.md ("Porting note: Vigenere key index") — this is a
// deliberate parity choice with DataEncrypt.html, not a bug.
test('key index advances by absolute position, including non-letters', () => {
    assert.equal(vigenere.encrypt('a b', { keyword: 'BA' }), 'b c');
});

test('for comparison: without the gap, the same letters shift differently', () => {
    assert.equal(vigenere.encrypt('aab', { keyword: 'BA' }), 'bac');
});

test('stepThrough yields one step per character with correct explanations', () => {
    const steps = [...vigenere.stepThrough('Hi!', { keyword: 'KEY' }, 'encrypt')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: 'R',
        explanation: "Vigenere Cipher: Using key letter 'K' (shift: +10) on 'H'",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});
