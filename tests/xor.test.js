import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/xor.js';

const xor = get('xor');

test('encrypts HI with key K (hand-verified)', () => {
    // H=72=01001000, K=75=01001011, XOR=00000011=3='03'
    // I=73=01001001, K=75=01001011, XOR=00000010=2='02'
    assert.equal(xor.encrypt('HI', { key: 'K' }), '0302');
});

test('round-trips HI', () => {
    assert.equal(xor.decrypt(xor.encrypt('HI', { key: 'K' }), { key: 'K' }), 'HI');
});

test('round-trips a longer string with a multi-character repeating key', () => {
    const original = 'Attack at dawn!';
    const params = { key: 'LEMON' };
    assert.equal(xor.decrypt(xor.encrypt(original, params), params), original);
});

test('every character becomes exactly 2 hex digits, including spaces and punctuation', () => {
    const encrypted = xor.encrypt('a b!', { key: 'K' });
    assert.equal(encrypted.length, 8); // 4 chars * 2 hex digits
    assert.match(encrypted, /^[0-9A-F]{8}$/);
});

test('empty or missing key falls back to KEY', () => {
    assert.equal(xor.encrypt('hello', { key: '' }), xor.encrypt('hello', { key: 'KEY' }));
});

test('decrypt tolerates a space separator between byte pairs (preserved in the output, like any other passthrough character)', () => {
    const params = { key: 'K' };
    const encrypted = xor.encrypt('HI', params);
    const spaced = `${encrypted.slice(0, 2)} ${encrypted.slice(2)}`;
    assert.equal(xor.decrypt(spaced, params), 'H I');
});

test('rejects an incomplete byte pair', () => {
    assert.throws(() => xor.decrypt('030', { key: 'K' }), {
        message: "Found a hex digit that isn't part of a complete byte pair",
    });
});

test('stepThrough in encrypt mode yields one step per input character', () => {
    const text = 'Hi!';
    const steps = [...xor.stepThrough(text, { key: 'K' }, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), xor.encrypt(text, { key: 'K' }));
});

test('stepThrough in decrypt mode: first digit of a pair produces no output', () => {
    const steps = [...xor.stepThrough('0302', { key: 'K' }, 'decrypt')];
    assert.equal(steps.length, 4);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: '0',
        newChar: '',
        explanation: "Reading high hex digit '0' — waiting for the low digit",
    });
    assert.equal(steps[1].newChar, 'H');
    assert.equal(steps[3].newChar, 'I');
});
