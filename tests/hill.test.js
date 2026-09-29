import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/hill.js';

const hill = get('hill');
const KEY = { a: 3, b: 3, c: 2, d: 5 }; // determinant 9, invertible mod 26 (inverse det is 3)

test('encrypts HI with the default matrix (hand-verified)', () => {
    // H=7,I=8. c1=3*7+3*8=45 mod26=19=T. c2=2*7+5*8=54 mod26=2=C.
    assert.equal(hill.encrypt('HI', KEY), 'TC');
});

test('round-trips HI', () => {
    assert.equal(hill.decrypt(hill.encrypt('HI', KEY), KEY), 'HI');
});

test('a lone leftover letter in odd-length text passes through unchanged', () => {
    // C=2,A=0 -> G=6,E=4 ("GE"); T is an unpaired leftover and stays "T".
    assert.equal(hill.encrypt('CAT', KEY), 'GET');
});

test('round-trips odd-length text (the leftover letter round-trips as a no-op)', () => {
    assert.equal(hill.decrypt(hill.encrypt('CAT', KEY), KEY), 'CAT');
});

test('round-trips text with punctuation and spaces, which pass through unchanged', () => {
    const original = 'Attack now!';
    const encrypted = hill.encrypt(original, KEY);
    assert.equal(encrypted[6], ' ');
    assert.equal(encrypted[10], '!');
    assert.equal(hill.decrypt(encrypted, KEY), original.toUpperCase());
});

test('rejects a non-invertible matrix', () => {
    assert.throws(() => hill.encrypt('HI', { a: 1, b: 1, c: 1, d: 1 }), {
        message: 'This matrix has no inverse mod 26 — its determinant must share no common factor with 26',
    });
});

test('rejects non-integer matrix values', () => {
    assert.throws(() => hill.encrypt('HI', { a: 3.5, b: 3, c: 2, d: 5 }), {
        message: 'Matrix values must be whole numbers',
    });
});

test('stepThrough yields one step per input character, matching encrypt()', () => {
    const text = 'Attack now!';
    const steps = [...hill.stepThrough(text, KEY, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), hill.encrypt(text, KEY));
});

test('a paired letter explains its partner', () => {
    const steps = [...hill.stepThrough('HI', KEY, 'encrypt')];
    assert.equal(steps[0].explanation, "Hill Cipher: 'H' and 'I' go through the matrix together → 'T'");
});

test('a lone leftover letter explains why it was left alone', () => {
    const steps = [...hill.stepThrough('CAT', KEY, 'encrypt')];
    assert.equal(steps[2].explanation, "Not changing 'T' — it's a lone leftover letter with no pair");
});
