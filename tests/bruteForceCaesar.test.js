import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/bruteForceCaesar.js';

const breaker = get('bruteforcecaesar');

test('is registered under the analysis category', () => {
    assert.equal(breaker.category, 'analysis');
});

test('tries all 25 shifts and one of them recovers the original plaintext', () => {
    // "Hello" encrypted with Caesar shift 3 is "Khoor"
    const result = breaker.encrypt('Khoor', {});
    assert.match(result, /Shift 3: Hello/);
});

test('produces exactly 25 shift attempts', () => {
    const result = breaker.encrypt('Khoor', {});
    const shiftCount = (result.match(/Shift \d+:/g) || []).length;
    assert.equal(shiftCount, 25);
});

test('preserves case and non-letters across all attempts', () => {
    const result = breaker.encrypt('Khoor, Zruog!', {});
    assert.match(result, /Shift 3: Hello, World!/);
});

test('encrypt and decrypt are the same operation (no meaningful direction for brute force)', () => {
    const text = 'Khoor';
    assert.equal(breaker.encrypt(text, {}), breaker.decrypt(text, {}));
});

test('stepThrough yields one step per input character, and only the last carries the report', () => {
    const steps = [...breaker.stepThrough('Khoor', {}, 'encrypt')];
    assert.equal(steps.length, 5);
    steps.slice(0, -1).forEach((step) => assert.equal(step.newChar, ''));
    assert.match(steps[4].newChar, /Shift 3: Hello/);
});

test('joining stepThrough output matches encrypt()', () => {
    const text = 'Khoor';
    const steps = [...breaker.stepThrough(text, {}, 'encrypt')];
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), breaker.encrypt(text, {}));
});
