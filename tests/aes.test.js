import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/aes.js';

const aes = get('aes');
const KEY = { key: 'SECRETKEY' };
const SIXTEEN_LETTERS = 'ABCDEFGHIJKLMNOP'; // exactly one full block

test('encrypting a full 16-letter block changes it', () => {
    const encrypted = aes.encrypt(SIXTEEN_LETTERS, KEY);
    assert.equal(encrypted.length, 16);
    assert.notEqual(encrypted, SIXTEEN_LETTERS);
});

test('round-trips exactly one full block', () => {
    assert.equal(aes.decrypt(aes.encrypt(SIXTEEN_LETTERS, KEY), KEY), SIXTEEN_LETTERS);
});

test('round-trips two full blocks (32 letters)', () => {
    const original = SIXTEEN_LETTERS + 'QRSTUVWXYZABCDEF';
    assert.equal(aes.decrypt(aes.encrypt(original, KEY), KEY), original);
});

test('a leftover partial block (not a multiple of 16 letters) passes through unchanged', () => {
    const text = 'ABCDEFGHIJKLMNOPQRS'; // 16 + 3 leftover
    const encrypted = aes.encrypt(text, KEY);
    assert.equal(encrypted.slice(16), 'QRS'); // leftover untouched
    assert.notEqual(encrypted.slice(0, 16), text.slice(0, 16)); // full block did change
});

test('round-trips text with a leftover block, spaces, and punctuation (case normalizes to uppercase, like Polybius/Playfair/Hill)', () => {
    const original = 'The Quick Brown Fox Jumps Over The Lazy Dog, Again!';
    assert.equal(aes.decrypt(aes.encrypt(original, KEY), KEY), original.toUpperCase());
});

test('fewer than 16 letters total: letters normalize to uppercase (consistent with processed letters) but are not run through the round', () => {
    assert.equal(aes.encrypt('Hi there!', KEY), 'HI THERE!');
});

test('different round keys produce different ciphertext', () => {
    const a = aes.encrypt(SIXTEEN_LETTERS, { key: 'KEYONE' });
    const b = aes.encrypt(SIXTEEN_LETTERS, { key: 'KEYTWO' });
    assert.notEqual(a, b);
});

test('stepThrough yields one step per input character, matching encrypt()', () => {
    const text = 'ABCDEFGHIJKLMNOPQ!';
    const steps = [...aes.stepThrough(text, KEY, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), aes.encrypt(text, KEY));
});

test('a leftover letter explains why it was left alone', () => {
    const steps = [...aes.stepThrough('ABCDEFGHIJKLMNOPQ', KEY, 'encrypt')];
    assert.match(steps[16].explanation, /full AES block needs 16 letters/);
});
