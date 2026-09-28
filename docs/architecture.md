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
