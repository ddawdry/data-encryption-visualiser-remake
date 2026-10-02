import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/sha256.js';

const sha256 = get('sha256');

test('matches the known test vector for "abc"', () => {
    assert.equal(
        sha256.encrypt('abc', {}),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
});

test('matches known SHA-256 hashes for strings with multi-byte UTF-8 characters', () => {
    // cross-checked against Node's native crypto.createHash('sha256') for these exact strings
    assert.equal(
        sha256.encrypt('Hello, World!', {}),
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f',
    );
    assert.equal(
        sha256.encrypt('café', {}),
        '850f7dc43910ff890f8879c0ed26fe697c93a067ad93a7d50f466a7028a9bf4e',
    );
    assert.equal(
        sha256.encrypt('\u{1F600}', {}), // emoji, encodes as a UTF-16 surrogate pair
        'f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9',
    );
});

test('encrypt and decrypt are the same operation (hashing has no inverse)', () => {
    const text = 'Some message';
    assert.equal(sha256.encrypt(text, {}), sha256.decrypt(text, {}));
});

test('output is always 64 hex characters, regardless of input length', () => {
    assert.equal(sha256.encrypt('a', {}).length, 64);
    assert.equal(sha256.encrypt('a'.repeat(1000), {}).length, 64);
    assert.match(sha256.encrypt('test', {}), /^[0-9a-f]{64}$/);
});

test('avalanche effect: a one-character change produces a completely different hash', () => {
    const hashA = sha256.encrypt('Hello', {});
    const hashB = sha256.encrypt('Hellp', {}); // last letter changed by one
    assert.notEqual(hashA, hashB);
    let sameCount = 0;
    for (let i = 0; i < hashA.length; i++) {
        if (hashA[i] === hashB[i]) sameCount++;
    }
    // with a real avalanche effect, most hex characters should differ, not just a handful
    assert.ok(sameCount < hashA.length / 2, `expected most characters to differ, but ${sameCount}/64 matched`);
});

test('stepThrough yields one step per input character, and only the last one carries the hash', () => {
    const text = 'abc';
    const steps = [...sha256.stepThrough(text, {}, 'encrypt')];
    assert.equal(steps.length, 3);
    assert.equal(steps[0].newChar, '');
    assert.equal(steps[1].newChar, '');
    assert.equal(steps[2].newChar, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('joining stepThrough output matches encrypt()', () => {
    const text = 'abc';
    const steps = [...sha256.stepThrough(text, {}, 'encrypt')];
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), sha256.encrypt(text, {}));
});
