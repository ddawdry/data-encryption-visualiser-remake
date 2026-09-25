import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/substitution.js';

const substitution = get('substitution');
const DEFAULT_KEY = 'QWERTYUIOPASDFGHJKLZXCVBNM';

test('encrypt then decrypt returns the original text', () => {
    const original = 'Hello, World!';
    const params = { key: DEFAULT_KEY };
    const encrypted = substitution.encrypt(original, params);
    const decrypted = substitution.decrypt(encrypted, params);
    assert.equal(decrypted, original);
});

test('maps letters per the key and preserves case', () => {
    assert.equal(substitution.encrypt('AB', { key: DEFAULT_KEY }), 'QW');
    assert.equal(substitution.encrypt('ab', { key: DEFAULT_KEY }), 'qw');
});

test('non-letters are left unchanged', () => {
    assert.equal(substitution.encrypt('Hello, World! 123', { key: DEFAULT_KEY }), 'Itssg, Vgksr! 123');
});

test('a key with stray non-letter characters is normalized before use', () => {
    const messyKey = 'QW3ERTYUIOP ASDFGHJKLZXCVBNM';
    assert.equal(substitution.encrypt('AB', { key: messyKey }), substitution.encrypt('AB', { key: DEFAULT_KEY }));
});

test('rejects a key with fewer than 26 letters', () => {
    assert.throws(
        () => substitution.encrypt('A', { key: 'QWERTYUIOP' }),
        { message: 'Your key needs all 26 letters with no repeats' },
    );
});

test('rejects a key with repeated letters', () => {
    const duplicateKey = 'QWERTYUIOPASDFGHJKLZXCVBNQ'; // 26 chars, but 'Q' repeats and 'M' is missing
    assert.throws(
        () => substitution.encrypt('A', { key: duplicateKey }),
        { message: 'Your key needs all 26 letters with no repeats' },
    );
});

test('rejects an empty key', () => {
    assert.throws(
        () => substitution.encrypt('A', { key: '' }),
        { message: 'Your key needs all 26 letters with no repeats' },
    );
});

test('stepThrough only validates the key once .next() is called', () => {
    const steps = substitution.stepThrough('A', { key: '' }, 'encrypt');
    assert.throws(() => steps.next(), { message: 'Your key needs all 26 letters with no repeats' });
});

test('stepThrough yields one step per character with correct explanations', () => {
    const steps = [...substitution.stepThrough('Hi!', { key: DEFAULT_KEY }, 'encrypt')];
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0], {
        index: 0,
        oldChar: 'H',
        newChar: 'I',
        explanation: "Substitution Cipher: Changing 'H' to 'I'",
    });
    assert.deepEqual(steps[2], {
        index: 2,
        oldChar: '!',
        newChar: '!',
        explanation: "Not changing '!' because it's not a letter",
    });
});
