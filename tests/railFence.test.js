import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/railFence.js';

const railFence = get('railfence');

test('matches a known 3-rail example', () => {
    // Row 0: W . . . E . . . C . . . R . . .
    // Row 1: . E . R . D . S . O . E . E . D
    // Row 2: . . A . . . I . . . V . . . . .
    // Reading rows: WECR + ERDSOEE + AIVD
    assert.equal(railFence.encrypt('WEAREDISCOVERED', { rails: 3 }), 'WECRERDSOEEAIVD');
});

test('encrypt then decrypt returns the original text', () => {
    const original = 'Attack at dawn, not dusk!';
    const params = { rails: 4 };
    const encrypted = railFence.encrypt(original, params);
    assert.equal(railFence.decrypt(encrypted, params), original);
});

test('round-trips with 2 rails (minimum) and many rails', () => {
    const original = 'The quick brown fox';
    for (const rails of [2, 3, 5, 10]) {
        const params = { rails };
        assert.equal(railFence.decrypt(railFence.encrypt(original, params), params), original);
    }
});

test('encrypting is a rearrangement, not a substitution — same letters, different order', () => {
    const original = 'LISTEN';
    const encrypted = railFence.encrypt(original, { rails: 3 });
    assert.equal(encrypted.length, original.length);
    assert.deepEqual([...encrypted].sort(), [...original].sort());
    assert.notEqual(encrypted, original);
});

test('rejects fewer than 2 rails', () => {
    assert.throws(() => railFence.encrypt('hello', { rails: 1 }), {
        message: 'Number of rails must be a whole number of 2 or more',
    });
});

test('rejects a non-integer rail count', () => {
    assert.throws(() => railFence.encrypt('hello', { rails: 2.5 }), {
        message: 'Number of rails must be a whole number of 2 or more',
    });
});

test('stepThrough in encrypt mode yields the same characters, in output order, as encrypt()', () => {
    const text = 'WEAREDISCOVERED';
    const params = { rails: 3 };
    const steps = [...railFence.stepThrough(text, params, 'encrypt')];
    assert.equal(steps.map((step) => step.newChar).join(''), railFence.encrypt(text, params));
    steps.forEach((step, i) => assert.equal(step.index, i));
});

test('stepThrough in decrypt mode yields the same characters, in output order, as decrypt()', () => {
    const text = railFence.encrypt('WEAREDISCOVERED', { rails: 3 });
    const params = { rails: 3 };
    const steps = [...railFence.stepThrough(text, params, 'decrypt')];
    assert.equal(steps.map((step) => step.newChar).join(''), railFence.decrypt(text, params));
});
