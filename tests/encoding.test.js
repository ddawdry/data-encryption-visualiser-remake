import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/encoding.js';

const base64 = get('base64');
const hex = get('hex');

test('base64: both are registered under the encoding category, not classical/modern', () => {
    assert.equal(base64.category, 'encoding');
    assert.equal(hex.category, 'encoding');
});

test('base64: encodes a 3-byte-aligned string', () => {
    assert.equal(base64.encrypt('ABCDEF', {}), 'QUJDREVG');
});

test('base64: encodes strings that need padding (1 or 2 leftover bytes)', () => {
    assert.equal(base64.encrypt('A', {}), 'QQ==');
    assert.equal(base64.encrypt('AB', {}), 'QUI=');
    assert.equal(base64.encrypt('ABC', {}), 'QUJD');
});

test('base64: round-trips arbitrary text, including spaces and punctuation', () => {
    const original = 'Hello, World! This is a test.';
    assert.equal(base64.decrypt(base64.encrypt(original, {}), {}), original);
});

test('base64: rejects characters outside standard byte range', () => {
    assert.throws(() => base64.encrypt('中', {}), { // a CJK character, code point 20013 > 255
        message: 'Base64 here only supports standard text (character codes 0-255)',
    });
});

test('base64: rejects invalid input on decode', () => {
    assert.throws(() => base64.decrypt('not valid!!', {}), /isn't valid Base64/);
});

test('base64: stepThrough yields one step per input character and matches encrypt()', () => {
    const text = 'ABCDEF';
    const steps = [...base64.stepThrough(text, {}, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), base64.encrypt(text, {}));
});

test('base64: oldChar stays the single original character (for correct undo), even though newChar can be a whole group', () => {
    const steps = [...base64.stepThrough('ABCDEF', {}, 'encrypt')];
    assert.equal(steps[0].oldChar, 'A');
    assert.equal(steps[1].oldChar, 'B');
    assert.equal(steps[1].newChar, '');
});

test('hex: encodes a character as its 2-digit byte value', () => {
    assert.equal(hex.encrypt('A', {}), '41');
});

test('hex: round-trips arbitrary text', () => {
    const original = 'Hello, World!';
    assert.equal(hex.decrypt(hex.encrypt(original, {}), {}), original);
});

test('hex: tolerates a space separator between byte pairs (preserved, like other passthrough chars)', () => {
    const encrypted = hex.encrypt('HI', {});
    const spaced = `${encrypted.slice(0, 2)} ${encrypted.slice(2)}`;
    assert.equal(hex.decrypt(spaced, {}), 'H I');
});

test('hex: rejects an incomplete byte pair', () => {
    assert.throws(() => hex.decrypt('410', {}), {
        message: "Found a hex digit that isn't part of a complete byte pair",
    });
});

test('hex: stepThrough yields one step per input character and matches encrypt()', () => {
    const text = 'Hi!';
    const steps = [...hex.stepThrough(text, {}, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), hex.encrypt(text, {}));
});
