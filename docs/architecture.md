# Architecture

## Folder layout

- `index.html` — shell page, mounts the app, no inline logic.
- `css/` — `tokens.css` (design variables), `base.css`, `layout.css`, `components.css`, `themes.css` (light/dark via CSS vars).
- `js/core/` — `cipherRegistry.js`, `stepEngine.js`, `historyStack.js`.
- `js/ui/` — `visualizer.js`, `nav.js`, `controls.js`, `resultPanel.js`, `themeToggle.js`, `permalink.js`, `historyPanel.js`, `cipherVisualization.js` (dispatches to a cipher's optional `visualize`, see below).
- `js/ciphers/` — one module per cipher.
- `js/analysis/` — `bruteForceCaesar.js`, `frequencyAnalysis.js`, `kasiski.js`.
- `tests/` — `node --test`, one file per cipher module.

## The cipher module contract

This is the seam that makes "add a cipher = write a module, register it" true. See [diagrams/cipher-contract.png](diagrams/cipher-contract.png) for the before/after against the original `DataEncrypt.html`.

A cipher module is a plain object matching the `CipherModule` typedef documented in `js/core/cipherRegistry.js`:

```js
{
  id: 'caesar',                 // unique id
  name: 'Caesar Cipher',        // display name
  category: 'classical',        // groups the cipher picker
  description: '...',           // shown in the description panel
  paramsSchema: [                // declarative fields the options panel renders
    { name: 'shift', label: 'Shift Amount', type: 'number', min: 1, max: 25, default: 3 }
  ],
  encrypt(text, params) { /* full transform, no animation */ },
  decrypt(text, params) { /* full transform, no animation */ },
  *stepThrough(text, params, mode) {
    // yields one { index, oldChar, newChar, explanation } per character
  }
}
```

A module registers itself with `cipherRegistry.register(module)` when its file is imported. Nothing else in the app — `stepEngine`, the UI, the tests — is edited to add a new cipher; they only ever go through `cipherRegistry.get(id)` / `.list()`.

### Optional: cipher-specific visualization

Most ciphers are fine with the generic char-block diff in `visualizer.js` (`oldChar → newChar` plus an explanation). Some aren't — a transposition cipher like Rail Fence rearranges characters rather than changing them, so a plain diff doesn't show the mechanism. For those, a cipher module can add an optional `visualize(container, { text, params, mode, currentIndex })` function to its registration object. `js/ui/cipherVisualization.js` calls it after every step if present, into a dedicated container in `index.html` — no `switch` statement anywhere checking "is this cipher special"; the module just opts in or doesn't.

This stays a rare escape hatch, not the default path — only reach for it when the generic diff genuinely can't show what's happening (see `js/ciphers/railFence.js` for the zigzag-grid example).

### A CipherStep's index is always "one per input character" — even when lengths don't match

`stepThrough` always yields exactly `text.length` steps, one per character of whatever was typed in — this is what lets `app.js` track progress and "done" state generically for every cipher, without knowing anything about how a specific cipher works. For a 1:1 cipher (Caesar, Vigenère, ...) that's also one step per output character. For Polybius Square, it isn't: one input letter produces two output digits (encrypt), and two input digits collapse into one output letter (decrypt).

The trick is that `displayChars[step.index]` (see "Runtime data flow" below) doesn't require `newChar` to be a single character — it's just a string slot. So `js/ciphers/polybius.js` yields a *variable-width contribution* per input position: encrypt's `newChar` can be a 2-digit string; decrypt's `newChar` is `''` for the first digit of a pair (nothing resolved yet) and the decoded letter for the second. `oldChar` always stays "whatever was in that slot before this step" (the original input character), so `historyStack`/"Back" still reverts correctly with zero special-casing — the generic engine never needed to know any of this.

### Design note: Playfair's self-paired letters

Textbook Playfair inserts a filler letter ('X') when a digraph would repeat a letter, or when a lone letter is left at the end — but inserting a character breaks the "one step per input character" rule above, same problem as Polybius. `js/ciphers/playfair.js` instead pairs such a letter with *itself*. The row/column/rectangle math doesn't care that both halves of a digraph are the same cell, so this changes nothing about the cryptographic logic — it only changes what happens to that one letter. It's also provably round-trip safe: the three rules always map two *different* letters to two different letters (shifting or swapping distinct grid cells can't collide), so a digraph that was a genuine pair during encryption can never look like a repeat during decryption, and vice versa — the pairing structure survives the round trip. See `tests/playfair.test.js` for a worked example (`HELLO` → `CFPPM` → `HELLO`) that exercises exactly this case.

### Design note: Hill cipher's leftover letter

Same family of problem as Polybius and Playfair: textbook Hill pads an odd leftover letter to complete the final pair, but inserting a character breaks the "one step per input character" rule. Playfair solved this by pairing a leftover letter with itself — Hill can't use that trick, because its matrix produces two generally-*different* output numbers for a pair, and only one of them could ever be written to the single real position. `js/ciphers/hill.js` instead leaves a lone leftover letter unchanged (normalized to uppercase, for consistency with every paired letter, which loses case through the matrix math regardless).

### Design note: Base64/Hex live in one file, and in their own category

`js/ciphers/encoding.js` registers both `base64` and `hex` — the only file here that registers more than one cipher, because the roadmap bundles them as a single checkpoint and they share one job: making "this isn't encryption" visible, not just stated in prose. They get their own `'encoding'` category (`nav.js`'s picker heading literally reads "Encoding — Not Encryption"), separate from `'classical'`/`'modern'`, so the UI itself carries the distinction.

Base64 also stretches the "one step per input character" model further than Polybius did: it works on 3-byte input groups producing 4-character output groups, not a 1:1 or 1:2 mapping. The group's full result is written to the *first* position's `newChar` (other positions in the group contribute `''`), but — importantly — `oldChar` still stays the single original character at that exact slot, not the whole group, since `oldChar` is what `historyStack`/"Back" reverts to. Only the explanation text mentions the full group.

### Design note: RSA's variable-width ciphertext

RSA's ciphertext numbers don't have a fixed width like Polybius's digit pairs or Hex's byte pairs — encrypting 'A' might give `0`, encrypting 'Z' might give `166`. A fixed-width parser can't tell where one number ends and the next begins, so `js/ciphers/rsa.js` separates them with spaces and has decrypt scan for runs of digits as tokens instead. To keep that parsing unambiguous, non-letter characters (including spaces you typed) aren't preserved in the ciphertext at all — they contribute `''`, the same zero-width-step technique Polybius and Base64 use, just reached for a different reason (parsing safety, not grouping). This is a deliberate, documented limitation: this demo only encrypts letters.

### Porting note: Vigenère key index

`js/ciphers/vigenere.js` advances the keyword index by the character's absolute position in the text (`i % keyword.length`), including spaces and punctuation — not by the count of letters seen so far. That's not the textbook Vigenère definition, but it's exactly what the original `DataEncrypt.html` did, and it was kept intentionally for parity when ported in. See `tests/vigenere.test.js` for tests that lock in this exact behavior.

## Runtime data flow

See [diagrams/architecture.png](diagrams/architecture.png) for the full module map. In short:

1. `app.js` bootstraps `cipherRegistry`, `stepEngine`, and `historyStack`, then mounts the UI layer.
2. The UI's cipher picker (`nav.js`) is built from `cipherRegistry.list()` — it never hardcodes cipher buttons.
3. On "Next Step", the UI calls `stepEngine.next()`. The engine fetches the active cipher via `cipherRegistry.get(id)`, pulls the next value from that cipher's `stepThrough()` generator, pushes the step onto `historyStack`, and yields it back to the UI (`visualizer.js`, `resultPanel.js`) to render.
4. On "Back", the UI pops a cached step off `historyStack` instead of asking the engine to run the generator backwards — generators can't be rewound, so rewind state is cached forward-only as it's produced. See [diagrams/step-flow.png](diagrams/step-flow.png) for the full state flow.

## UI layout

[diagrams/ui-wireframe.png](diagrams/ui-wireframe.png) shows the region layout of `index.html`: header, mode switch, registry-driven cipher picker, a dynamic options panel generated from the active cipher's `paramsSchema`, description panel, visualization area, step controls, and result box.

## Testing

Cipher modules are tested with Node's built-in test runner (`node:test` + `node:assert/strict`) — no test framework, no extra dependencies. `package.json` only exists to set `"type": "module"` so `import`/`export` work under Node the same way they do in the browser.

- One test file per cipher module in `tests/`, mirroring `js/ciphers/`.
- Each imports the module for its side-effect registration, then fetches it from `cipherRegistry.get(id)` and calls `encrypt`/`decrypt`/`stepThrough` directly — no DOM involved, since the cipher modules themselves never touch `document`.
- Run everything with `npm test` or `node --test`.
- Coverage per module: round-trip (encrypt then decrypt returns the original), case preservation, non-letter pass-through, invalid-input handling, and a `stepThrough` shape check. Anything that was a deliberate porting decision (like Vigenère's key-index behavior) gets a test that locks it in, not just a comment.
