import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/rsa.js';

const rsa = get('rsa');
const KEYS = { p: 17, q: 19, e: 5 }; // n=323, totient=288, d=173 (verified numerically)

test('encrypts a single letter (hand/numerically verified)', () => {
    // D=3, 3^5 mod 323 = 243
    assert.equal(rsa.encrypt('D', KEYS), '243');
});

test('round-trips a single letter', () => {
    assert.equal(rsa.decrypt(rsa.encrypt('D', KEYS), KEYS), 'D');
});

test('round-trips a whole word', () => {
    const original = 'HELLO';
    assert.equal(rsa.decrypt(rsa.encrypt(original, KEYS), KEYS), original);
});

test('round-trips text with spaces and punctuation, which are dropped (not preserved)', () => {
    const encrypted = rsa.encrypt('Hi there!', KEYS);
    assert.equal(rsa.decrypt(encrypted, KEYS), 'HITHERE');
});

test('ciphertext is space-separated numbers', () => {
    assert.match(rsa.encrypt('HI', KEYS), /^\d+ \d+$/);
});

test('rejects non-prime p or q', () => {
    assert.throws(() => rsa.encrypt('HI', { p: 16, q: 19, e: 5 }), {
        message: 'p and q must both be prime numbers',
    });
});

test('rejects p equal to q', () => {
    assert.throws(() => rsa.encrypt('HI', { p: 17, q: 17, e: 5 }), {
        message: 'p and q must be different primes',
    });
});

test('rejects primes too small for the letter range (p*q <= 25)', () => {
    assert.throws(() => rsa.encrypt('HI', { p: 2, q: 3, e: 1 }), {
        message: 'p × q must be greater than 25 so every letter A-Z fits in the message space',
    });
});

test('rejects an e that is not coprime with totient', () => {
    // totient=288=2^5*3^2; e=4 shares a factor of 2
    assert.throws(() => rsa.encrypt('HI', { p: 17, q: 19, e: 4 }), /share no common factor/);
});

test('stepThrough in encrypt mode yields one step per input character', () => {
    const text = 'Hi!';
    const steps = [...rsa.stepThrough(text, KEYS, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join('').trim(), rsa.encrypt(text, KEYS));
});

test('a non-letter is dropped from the ciphertext with an explanation', () => {
    const steps = [...rsa.stepThrough('!', KEYS, 'encrypt')];
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: '!',
        newChar: '',
        explanation: "Not included in the ciphertext: '!' — this demo only encrypts letters",
    });
});

test('stepThrough in decrypt mode resolves a variable-width number token in one step', () => {
    const steps = [...rsa.stepThrough('243', KEYS, 'decrypt')];
    assert.equal(steps.length, 3); // one per character of the token, per the one-step-per-char rule
    assert.equal(steps[0].newChar, 'D');
    assert.equal(steps[1].newChar, '');
    assert.equal(steps[2].newChar, '');
});
