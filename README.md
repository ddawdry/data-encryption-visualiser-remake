# Data Encryption Visualiser

**[Live demo →](https://ddawdry.github.io/data-encryption-visualiser-remake/)**

An interactive tool for visualising how encryption, decryption, and cryptanalysis algorithms actually work — step by step, one character at a time. Originally a first-year university project; rebuilt from scratch as a personal learning project, now covering 20 algorithms across four categories, with zero frameworks and zero build step.

## Features

- **Step-by-step animation** for every algorithm — click through one character at a time, or press Play to watch it run at an adjustable speed. Several algorithms (Rail Fence, Polybius Square, Hill Cipher, AES, RSA, Diffie-Hellman, SHA-256, frequency analysis, Kasiski examination) get a custom visualization beyond the generic character diff — a zigzag grid, a 4x4 matrix, a key-generation breakdown, a bar chart, highlighted repeats, and so on.
- **Dark mode**, a responsive layout, and keyboard/screen-reader accessibility (ARIA labels, live-region step announcements).
- **Shareable permalinks** — the URL updates live with your cipher, parameters, and text, so a link reproduces your exact setup.
- **Side-by-side comparison** of two ciphers on the same text, and a **session history** panel to revisit past runs.
- **Installable as a PWA**, with offline support via a service worker.
- **162 automated tests**, run with Node's built-in test runner — no test framework, no dependencies.

### Algorithms and tools

**Classical ciphers** — Caesar, Vigenère, Substitution, ROT13, Atbash, Rail Fence, Polybius Square, Playfair, Hill Cipher

**Modern & conceptual cryptography** — XOR Cipher, One-Time Pad, RSA (simplified), Diffie-Hellman key exchange, AES (conceptual round visualizer), SHA-256 (avalanche effect demo)

**Encoding** (explicitly distinguished from encryption in the app itself) — Base64, Hex

**Cryptanalysis tools** — Brute-Force Caesar Breaker, Frequency Analysis, Kasiski Examination

## Running it

Open `index.html` — but serve it over `http://`, don't just double-click it (it uses native ES modules, which browsers block from `file://`). See [docs/README.md](docs/README.md) for exact steps (VS Code Live Server, `npx serve`, etc.).

## Testing

```
npm test
```

Runs the full suite via Node's built-in test runner (`node --test`) — no dependencies to install.

## Architecture

This is vanilla HTML/CSS/JavaScript — no frameworks, no bundler, no build step. The core idea: adding a new cipher means writing one self-contained module and registering it; nothing else in the app changes. See [docs/architecture.md](docs/architecture.md) for the full module contract, data flow, and the design decisions behind some of the trickier algorithms (transposition ciphers, variable-width outputs, asymmetric key exchange — none of which fit a simple "transform this text" model at first glance). For the project's vision and scope, see [docs/scope.md](docs/scope.md).
