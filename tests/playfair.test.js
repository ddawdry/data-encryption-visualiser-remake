import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from '../js/core/cipherRegistry.js';
import '../js/ciphers/playfair.js';

const playfair = get('playfair');

// MONARCHY grid (I/J merged):
// M O N A R
// C H Y B D
// E F G I K
// L P Q S T
// U V W X Z

test('encrypts HELLO with keyword MONARCHY (hand-verified)', () => {
    // H,E -> rectangle: H(1,1)->grid[1][0]=C, E(2,0)->grid[2][1]=F
    // L -> self-paired (next letter is also L): row rule, L(3,0) col+1 -> P
    // L,O -> rectangle: L(3,0)->grid[3][1]=P, O(0,1)->grid[0][0]=M
    assert.equal(playfair.encrypt('HELLO', { keyword: 'MONARCHY' }), 'CFPPM');
});

test('round-trips HELLO (covers a repeated-letter digraph and a normal digraph)', () => {
    const original = 'HELLO';
    const params = { keyword: 'MONARCHY' };
    assert.equal(playfair.decrypt(playfair.encrypt(original, params), params), original);
});

test('round-trips text with an odd number of letters (lone trailing letter)', () => {
    const original = 'ATTACK';
    const params = { keyword: 'MONARCHY' };
    // 6 letters is even, so also check a genuinely odd one:
    const odd = 'ATTACKS';
    assert.equal(playfair.decrypt(playfair.encrypt(original, params), params), original);
    assert.equal(playfair.decrypt(playfair.encrypt(odd, params), params), odd);
});

test('round-trips text with punctuation and spaces, which pass through unchanged', () => {
    const original = 'Attack at dawn!';
    const params = { keyword: 'MONARCHY' };
    const encrypted = playfair.encrypt(original, params);
    assert.equal(encrypted[6], ' ');
    assert.equal(encrypted[9], ' ');
    assert.equal(encrypted[14], '!');
    assert.equal(playfair.decrypt(encrypted, params), original.toUpperCase());
});

test('same row uses the row rule (shift right/left, wrapping)', () => {
    // M and O are both in row 0 (columns 0 and 1)
    const result = playfair.encrypt('MO', { keyword: 'MONARCHY' });
    assert.equal(result, 'ON'); // M->col1=O, O->col2=N
});

test('same column uses the column rule (shift down/up, wrapping)', () => {
    // M (row0,col0) and C (row1,col0) share column 0
    const result = playfair.encrypt('MC', { keyword: 'MONARCHY' });
    assert.equal(result, 'CE'); // M->row1=C, C->row2=E
});

test('an empty or missing keyword falls back to the plain unkeyed grid without error', () => {
    assert.doesNotThrow(() => playfair.encrypt('HELLO', { keyword: '' }));
});

test('stepThrough yields one step per input character, matching encrypt()', () => {
    const text = 'Attack at dawn!';
    const params = { keyword: 'MONARCHY' };
    const steps = [...playfair.stepThrough(text, params, 'encrypt')];
    assert.equal(steps.length, text.length);
    const rebuilt = text.split('');
    steps.forEach((step) => {
        rebuilt[step.index] = step.newChar;
    });
    assert.equal(rebuilt.join(''), playfair.encrypt(text, params));
});

test('a self-paired letter explains that it has no partner', () => {
    const steps = [...playfair.stepThrough('HELLO', { keyword: 'MONARCHY' }, 'encrypt')];
    assert.match(steps[2].explanation, /has no partner here/);
});

test('a normal digraph explains its partner and rule', () => {
    const steps = [...playfair.stepThrough('HELLO', { keyword: 'MONARCHY' }, 'encrypt')];
    assert.equal(steps[0].explanation, "Playfair: 'H' pairs with 'E' (rectangle rule) → 'C'");
});
