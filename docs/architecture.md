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

### Design note: Diffie-Hellman isn't a cipher, so it's split in two

Diffie-Hellman is a key-*exchange* protocol, not an encrypt/decrypt operation — there's no "text" being transformed by it, which doesn't fit the `CipherModule` contract at all. `js/ciphers/diffieHellman.js` splits the concept in two: the actual exchange (Alice/Bob, their private keys, the public values they trade, and the shared secret both derive) lives entirely in `visualize()`, always fully shown since the protocol completes instantly regardless of which message character is being stepped through — same approach as RSA's key panel. The derived shared secret is then used as an ordinary Caesar shift on the typed message, which both demonstrates what key exchange is actually *for* in practice, and keeps `stepThrough` perfectly consistent with every other cipher's one-step-per-character model — no special-casing needed anywhere else in the app.

### Design note: AES is schematic, not spec-accurate — by design

`js/ciphers/aes.js` shows the same four STAGES real AES uses (SubBytes, ShiftRows, MixColumns, AddRoundKey) on a 4x4 block of 16 letters, but with simplified, still-genuinely-invertible stand-ins: a fixed substitution table instead of AES's real GF(2^8) S-box, a simple column rotation instead of AES's polynomial MixColumns math, and mod-26 addition instead of byte-level XOR. ShiftRows is implemented faithfully (it's pure rearrangement, no finite-field math needed). This was the intended scope from the start — the goal is showing *why* AES needs several different kinds of operation working together, not reproducing the real cipher.

Leftover letters that don't fill a complete 16-letter block are left unchanged, same pattern as Hill cipher's lone leftover letter — and like Hill, they're still normalized to uppercase for consistency with the letters that *do* get processed (caught the same mixed-case bug here as in Hill cipher: testing it showed `"...Dog, Again!"`'s leftover letters keeping their original case while the processed block came out uppercase).

### Design note: SHA-256 is a hash, not a cipher — hand-rolled, not native

`js/ciphers/sha256.js` is the only module that isn't a cipher at all: hashing is one-way, so `encrypt`/`decrypt` both just compute the same hash. It's implemented by hand rather than via the browser's native `crypto.subtle.digest()`, because that API is asynchronous (returns a Promise) and this app's entire step engine is synchronous by design — making one cipher async would mean either rewriting `stepEngine` for everything or giving this one module a special-cased code path, neither worth it for a hash demo. Verified against the standard SHA-256 test vectors (`""` and `"abc"`) and cross-checked against Node's native `crypto` module for strings containing multi-byte UTF-8 characters (an accented letter, an emoji requiring a UTF-16 surrogate pair) — hand-rolled cryptographic code is exactly where subtle bugs hide, so this one got more external verification than most ciphers here.

Only the *last* step of `stepThrough` carries the actual 64-character hash (every earlier step contributes `''`), since the hash can't be known until the whole message is in — same zero-width-step technique as Polybius/Base64/RSA, just because the hash genuinely depends on the entire input rather than any single position.

### Design note: Kasiski must measure distances in absolute position, not letter count

`js/ciphers/kasiski.js` measures the distance between repeated ciphertext sequences in **absolute text position**, including spaces and punctuation — not letter-only count. This matters because it has to match whatever periodicity this app's own `vigenere.js` actually produces, and that cipher deliberately cycles its key by absolute position (the porting note above). Measuring in letter-only position would silently give a wrong key-length estimate for any ciphertext containing spaces, since the real repeat spacing in that ciphertext is governed by absolute position, not letter count. Verified against real output from this app's own Vigenère cipher, not just a hand-constructed string, in `tests/kasiski.test.js`.

Also worth noting: a single repeated distance often can't distinguish between a factor and its multiples (e.g. 10 could mean key length 2, 5, or 10) — that's a genuine limitation of Kasiski examination, not a bug, so the tool reports the GCD's full factor list as candidates rather than overconfidently picking one answer.

### Design note: the Canvas animation is deliberately `aria-hidden`

`js/ui/visualizer.js` renders the char-block animation on a `<canvas>` (for a real animated entrance per block, via `requestAnimationFrame`) rather than as DOM elements. Canvas content has no text for screen readers to read — normally a real accessibility regression. It's acceptable here specifically because the *same* information (which character changed, and why) is already announced through `#stepExplanation`'s live region, built in checkpoint 30 — the canvas is a visual supplement for sighted users, not the only place the information exists. `index.html` marks it `aria-hidden="true"` to make that relationship explicit rather than leaving an unlabeled, silently-inaccessible element. This reasoning wouldn't hold if the canvas were the *only* source of some information — it only applies because the live region already fully covers it.

### Design note: comparison mode shows full results, not a synced animation

`js/ui/comparisonPanel.js` lets you compare the active cipher against a second one on the same text, but deliberately shows the second cipher's complete result (via its plain `encrypt`/`decrypt`, using its own default params) rather than a second synced step-by-step animation. Properly animating two ciphers side by side would mean a second `stepEngine`, `historyStack`, options panel, and visualization panel — essentially doubling the app's entire interactive surface for one checkpoint. The chosen scope (same text and mode, two full results, side by side) still delivers the actual comparison the checkpoint asks for, just without the animation on the second side.

### Design note: the PWA icons are hand-encoded PNGs, not a dependency

`assets/icon-192.png` and `assets/icon-512.png` (a simple blocky padlock, referenced from `manifest.json`) were generated with a small one-off Node script that writes raw PNG bytes directly (PNG signature, `IHDR`/`IDAT`/`IEND` chunks, CRC32, `zlib.deflateSync` for the compressed pixel data) rather than pulling in an image-generation dependency — consistent with this project having no build step and no dependencies beyond Node's built-ins. Verified against an independent decoder (not just "my encoder says it's fine"): loaded both files with .NET's `System.Drawing.Image` and confirmed correct dimensions and exact pixel colors at known sample points. The generator script itself isn't committed — it was a one-off tool to produce two static image files, the same way a human would use any image editor once and commit the result, not the editor.

### Design note: the service worker caches at runtime, not from a precache list

`sw.js` doesn't hardcode a list of files to precache on install. With 19+ cipher modules and growing, a hand-maintained list would silently go stale the next time a cipher file was added without remembering to also update `sw.js` — exactly the kind of maintenance trap worth avoiding. Instead it caches opportunistically: whatever the page actually requests gets cached (cache-first if already cached, with a background fetch to keep it fresh; network-first with caching if not seen before). This means a first online visit naturally caches everything the app loads, with nothing to keep in sync by hand. `CACHE_NAME`'s version suffix is the one thing that does need bumping by hand, to force clients to discard an old cache after a deploy.

### Porting note: Vigenère key index

`js/ciphers/vigenere.js` advances the keyword index by the character's absolute position in the text (`i % keyword.length`), including spaces and punctuation — not by the count of letters seen so far. That's not the textbook Vigenère definition, but it's exactly what the original `DataEncrypt.html` did, and it was kept intentionally for parity when ported in. See `tests/vigenere.test.js` for tests that lock in this exact behavior.

### Design note: RSA, AES, and SHA-256 are dynamically imported

Those three are the heaviest cipher modules (the most math), so `app.js` doesn't statically import them — nothing fetches or parses their code until the user actually selects one, keeping the initial bundle smaller. The tricky part: `cipherRegistry.register()` throws on a duplicate id, but the cipher picker needs each one's `name`/`description`/`paramsSchema` to render *before* its file has loaded. `cipherRegistry.js` solves this with `registerLazy(meta, load)`: it registers a placeholder immediately (its `encrypt`/`decrypt`/`stepThrough` just throw a "still loading" error) and remembers the id in a `lazyStubIds` set, which `register()` checks to allow exactly one overwrite for that id. When `app.js` later calls `load()` (a dynamic `import()`), the real file's own unchanged `register({...})` call replaces the stub — so the three cipher files needed zero logic changes, only a comment noting their metadata is duplicated in `app.js` and must stay in sync.

One subtlety this created: `app.js` holds cipher references (`activeCipher`, the comparison-panel selection) picked from `ciphers = list()`, an array snapshotted once at bootstrap. Awaiting the lazy loader replaces the *registry's* entry, not the stale stub object that array element still points to. `startRun()` and `updateComparison()` both re-fetch via `cipherRegistry.get(id)` right after awaiting the load, to pick up the real module instead of continuing to hold the stub.

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
