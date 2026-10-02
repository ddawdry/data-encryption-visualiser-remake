import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/frequencyAnalysis.js';

const freq = get('frequencyanalysis');

test('is registered under the analysis category', () => {
    assert.equal(freq.category, 'analysis');
});

test('counts letter frequencies correctly on a simple known string', () => {
    // "AAAB" -> A appears 3/4 times (75%), B appears 1/4 (25%), everything else 0%
    const result = freq.encrypt('AAAB', {});
    assert.match(result, /A: 75\.0%/);
    assert.match(result, /B: 25\.0%/);
    assert.match(result, /C: 0\.0%/);
});

test('is case-insensitive and ignores non-letters', () => {
    const result = freq.encrypt('a1a2A!', {});
    assert.match(result, /A: 100\.0%/);
});

test('includes the standard English baseline for comparison', () => {
    const result = freq.encrypt('hello', {});
    assert.match(result, /E: \d+\.\d% \(English: 12\.7%\)/);
});

test('encrypt and decrypt are the same operation (no meaningful direction for analysis)', () => {
    const text = 'the quick brown fox';
    assert.equal(freq.encrypt(text, {}), freq.decrypt(text, {}));
});

test('stepThrough yields one step per input character, and only the last carries the report', () => {
    const steps = [...freq.stepThrough('AB', {}, 'encrypt')];
    assert.equal(steps.length, 2);
    assert.equal(steps[0].newChar, '');
    assert.match(steps[1].newChar, /A: 50\.0%/);
});

test('joining stepThrough output matches encrypt()', () => {
    const text = 'Substitution Cipher';
    const steps = [...freq.stepThrough(text, {}, 'encrypt')];
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), freq.encrypt(text, {}));
});

test('empty or non-letter-only text produces all-zero frequencies without crashing', () => {
    assert.doesNotThrow(() => freq.encrypt('!!! 123', {}));
    const result = freq.encrypt('!!! 123', {});
    assert.match(result, /A: 0\.0%/);
});
