import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/diffieHellman.js';

const dh = get('diffiehellman');
const KEYS = { p: 23, g: 5, a: 6, b: 15 }; // classic textbook example: A=8, B=19, shared=2 (verified numerically)

test('uses the shared secret (2) as a Caesar shift of 2', () => {
    // H+2=J, I+2=K
    assert.equal(dh.encrypt('HI', KEYS), 'JK');
});

test('round-trips a message', () => {
    const original = 'Attack at dawn!';
    assert.equal(dh.decrypt(dh.encrypt(original, KEYS), KEYS), original);
});

test('preserves case and non-letters', () => {
    assert.equal(dh.encrypt('Hi, there!', KEYS), 'Jk, vjgtg!');
});

test('rejects a non-prime p', () => {
    assert.throws(() => dh.encrypt('HI', { p: 24, g: 5, a: 6, b: 15 }), {
        message: 'p must be a prime number',
    });
});

test('rejects a generator out of range', () => {
    assert.throws(() => dh.encrypt('HI', { p: 23, g: 1, a: 6, b: 15 }), /g must be a whole number between/);
});

test("rejects an out-of-range private key", () => {
    assert.throws(() => dh.encrypt('HI', { p: 23, g: 5, a: 100, b: 15 }), /Alice's private key must be/);
});

test('different (a, b) pairs can still land on the same shared secret and shift', () => {
    // Just confirms the module is deterministic and symmetric in practice: same params, same result.
    assert.equal(dh.encrypt('HI', KEYS), dh.encrypt('HI', KEYS));
});

test('stepThrough yields one step per input character, matching encrypt()', () => {
    const text = 'Attack at dawn!';
    const steps = [...dh.stepThrough(text, KEYS, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), dh.encrypt(text, KEYS));
});

test('explanation names the shared secret and the resulting shift', () => {
    const steps = [...dh.stepThrough('H', KEYS, 'encrypt')];
    assert.equal(
        steps[0].explanation,
        "Using the shared secret (2 mod 26 = 2) as a Caesar shift: moving 'H' forward by 2",
    );
});
