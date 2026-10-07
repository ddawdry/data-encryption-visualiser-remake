# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [1.0.0] - 2026-10-09

The initial release of the rebuilt project. What started as a single-file, three-cipher university assignment (`DataEncrypt.html`) was rewritten from scratch as a modular, tested, deployed application.

### Added

- Registry-based cipher architecture: each algorithm is a self-contained module that registers itself with `cipherRegistry.js` — adding a new cipher never requires touching the UI, step engine, or picker.
- Generator-driven step engine (`stepEngine.js`) with forward-only cached rewind (`historyStack.js`), replacing manual position tracking.
- 20 algorithms across four categories:
  - **Classical ciphers** — Caesar, Vigenère, Substitution, ROT13, Atbash, Rail Fence, Polybius Square, Playfair, Hill Cipher
  - **Modern & conceptual cryptography** — XOR Cipher, One-Time Pad, RSA (simplified), Diffie-Hellman key exchange, AES (conceptual round visualizer), SHA-256 (avalanche effect demo)
  - **Encoding** — Base64, Hex, with an explicit encoding-vs-encryption callout in the UI
  - **Cryptanalysis tools** — Brute-Force Caesar Breaker, Frequency Analysis, Kasiski Examination
- Custom per-cipher visualizations beyond the generic character diff: a zigzag grid (Rail Fence), a coordinate grid (Polybius), a matrix view (Hill), a 4x4 round state (AES), key-generation breakdowns (RSA, Diffie-Hellman), a bar chart (frequency analysis), and highlighted repeats (Kasiski).
- Canvas-based step animation with smooth per-character transitions.
- Side-by-side cipher comparison mode.
- Session history panel to revisit past runs.
- Shareable permalinks — cipher, mode, parameters, and text are encoded in the URL.
- Play/pause with adjustable speed, and step-back (rewind).
- Dark mode via CSS custom properties and `prefers-color-scheme`.
- Responsive layout for mobile widths.
- Keyboard navigation, ARIA labels, and live-region announcements for step explanations.
- Installable PWA support: manifest, hand-encoded PNG icons, and a service worker with runtime (not precached) asset caching.
- 162 automated tests via Node's built-in test runner — no test framework, no dependencies.
- Deployment to GitHub Pages via GitHub Actions on every push to `main`.
- Favicon, meta description, and Open Graph/Twitter card tags.
- Project documentation covering architecture decisions, scope, and diagrams, in `docs/`.

### Changed

- Retired the original single-file `DataEncrypt.html` once the new app reached feature parity.
- Removed the six stray duplicate text-fragment files left over from the original project.

### Performance

- RSA, AES, and SHA-256 — the three heaviest cipher modules — are now loaded on demand via dynamic `import()` instead of in the initial bundle.
- Removed unused CSS rules and the custom properties they depended on.
