import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/onetimepad.js';

const otp = get('onetimepad');

test('encrypts HELLO with a key at least as long (no reuse)', () => {
    // H+A=H, E+B=F, L+C=N, L+D=O, O+E=S
    assert.equal(otp.encrypt('HELLO', { key: 'ABCDE' }), 'HFNOS');
});

test('encrypts HELLO with a short key that wraps around (reuse)', () => {
    // key "AB": H+A=H, E+B=F, L+A=L, L+B=M, O+A=O
    assert.equal(otp.encrypt('HELLO', { key: 'AB' }), 'HFLMO');
});

test('round-trips with a key exactly as long as the message', () => {
    const original = 'ATTACK AT DAWN';
    const params = { key: 'LEMONLEMONLEMO' };
    assert.equal(otp.decrypt(otp.encrypt(original, params), params), original);
});

test('round-trips even when the key is short and wraps (math still inverts correctly)', () => {
    const original = 'ATTACK AT DAWN';
    const params = { key: 'AB' };
    assert.equal(otp.decrypt(otp.encrypt(original, params), params), original);
});

test('a default random key is generated and is long and letters-only', () => {
    const [field] = otp.paramsSchema;
    assert.equal(field.name, 'key');
    assert.match(field.default, /^[A-Z]{100}$/);
});

test('empty key falls back rather than crashing', () => {
    assert.doesNotThrow(() => otp.encrypt('hello', { key: '' }));
});

test('stepThrough flags key reuse only once the key has wrapped around', () => {
    const steps = [...otp.stepThrough('HELLO', { key: 'AB' }, 'encrypt')];
    assert.doesNotMatch(steps[0].explanation, /breaks perfect secrecy/);
    assert.doesNotMatch(steps[1].explanation, /breaks perfect secrecy/);
    assert.match(steps[2].explanation, /breaks perfect secrecy/);
    assert.match(steps[3].explanation, /breaks perfect secrecy/);
    assert.match(steps[4].explanation, /breaks perfect secrecy/);
});

test('stepThrough does not flag reuse when the key is long enough', () => {
    const steps = [...otp.stepThrough('HELLO', { key: 'ABCDE' }, 'encrypt')];
    steps.forEach((step) => assert.doesNotMatch(step.explanation, /breaks perfect secrecy/));
});

test('the key index advances only over letters, unlike this app\'s Vigenere', () => {
    // Vigenere advances by absolute position (deliberately, for parity with the original app);
    // a brand-new cipher like this one isn't bound by that, so it advances per letter instead.
    const steps = [...otp.stepThrough('a b', { key: 'AB' }, 'encrypt')];
    // positions: a(letter,key[0]=A), space(passthrough), b(letter,key[1]=B) — key index is NOT
    // affected by the space, unlike Vigenere where it would be.
    assert.equal(steps[0].newChar, 'a'); // a+A(shift0)
    assert.equal(steps[2].newChar, 'c'); // b+B(shift1)
});
