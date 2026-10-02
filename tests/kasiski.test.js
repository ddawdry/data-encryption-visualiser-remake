import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/kasiski.js';
import '../js/ciphers/vigenere.js';

const kasiski = get('kasiski');
const vigenere = get('vigenere');

test('is registered under the analysis category', () => {
    assert.equal(kasiski.category, 'analysis');
});

test('finds a repeated sequence and computes the correct GCD and factor candidates (hand-verified)', () => {
    // "ABC" repeats at positions 0, 6, 12 -> distances 6, 12, 6 -> GCD 6 -> factors 2, 3, 6
    const result = kasiski.encrypt('ABCXYZABCPQRABC', {});
    assert.match(result, /Distances between repeats: 6, 12, 6/);
    assert.match(result, /GCD: 6/);
    assert.match(result, /Likely key length is one of its factors: 2, 3, 6/);
});

test('reports no repeats found when there are none', () => {
    assert.equal(kasiski.encrypt('ABCDEFGHIJKLMNOP', {}), 'No repeated 3-letter sequences found — try a longer message.');
});

test('correctly identifies the true key length among the candidates, against real Vigenere ciphertext', () => {
    // Verified against this app's own vigenere.js: 'THE SECRETTHE SECRET' encrypted with keyword
    // 'AB' (key length 2) produces 5 repeated 3-letter sequences, all at distance 10 (a multiple
    // of 2). The GCD alone can't distinguish 2 from 5 or 10 here (a real limitation of the
    // technique with only one distinct distance value) — but 2, the true key length, is among
    // the reported candidates.
    const plaintext = 'THE SECRETTHE SECRET';
    const ciphertext = vigenere.encrypt(plaintext, { keyword: 'AB' });
    const result = kasiski.encrypt(ciphertext, {});
    assert.match(result, /GCD: 10/);
    assert.match(result, /Likely key length is one of its factors: 2, 5, 10/);
});

test('distances are measured in absolute text position, not letter-only count (matches this app\'s Vigenere key cycling)', () => {
    // Two "ABC" occurrences separated by a space: positions 0-2 and 4-6 (not 0-2 and 3-5), since
    // the space at index 3 counts toward the distance.
    const result = kasiski.encrypt('ABC ABC', {});
    assert.match(result, /Distances between repeats: 4/);
});

test('a sequence window spanning a non-letter character is not treated as a match', () => {
    // "AB C" (with a space) should not match a literal "ABC" elsewhere, since the window A-B-space
    // isn't all-letter and is skipped entirely.
    const result = kasiski.encrypt('AB CABC', {});
    assert.equal(result, 'No repeated 3-letter sequences found — try a longer message.');
});

test('encrypt and decrypt are the same operation (no meaningful direction for analysis)', () => {
    const text = 'ABCXYZABCPQRABC';
    assert.equal(kasiski.encrypt(text, {}), kasiski.decrypt(text, {}));
});

test('stepThrough yields one step per input character, and only the last carries the report', () => {
    const text = 'ABCXYZABCPQRABC';
    const steps = [...kasiski.stepThrough(text, {}, 'encrypt')];
    assert.equal(steps.length, text.length);
    steps.slice(0, -1).forEach((step) => assert.equal(step.newChar, ''));
    assert.match(steps[steps.length - 1].newChar, /GCD: 6/);
});

test('joining stepThrough output matches encrypt()', () => {
    const text = 'ABCXYZABCPQRABC';
    const steps = [...kasiski.stepThrough(text, {}, 'encrypt')];
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), kasiski.encrypt(text, {}));
});
