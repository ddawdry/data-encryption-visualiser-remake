# Scope

## Vision

An educational, interactive tool for visualizing how encryption/decryption algorithms work, step by step — for students, educators, and the curious. Originally a university project; now being rebuilt as a personal learning/portfolio project.

## Stack

Vanilla HTML/CSS/JS, modularized into real files with ES modules — no bundler, no framework, no build step. Runs by opening `index.html` (or serving it with any static file server).

## In scope

- Classical ciphers: Caesar, Vigenère, Substitution (existing), plus ROT13, Atbash, Rail Fence, Polybius Square, Playfair, Hill.
- Conceptual modern crypto: XOR cipher, One-Time Pad, Base64/Hex encoding (explicitly labeled as encoding, not encryption), simplified RSA, Diffie-Hellman key exchange, a schematic AES round visualizer, SHA-256 avalanche-effect demo.
- Cryptanalysis tools: brute-force Caesar breaker, frequency analysis for Substitution, Kasiski examination for Vigenère.
- A generic, registry-driven step-through visualization engine — adding a new cipher should mean "write a module, register it," not touching a big `switch` statement or hardcoded UI.
- Accessibility (keyboard nav, ARIA, live-region step announcements), responsive layout, dark mode.
- Lightweight tests (Node's built-in `node --test`, no extra dependencies) for cipher correctness.
- PWA basics (installable, offline static assets) and GitHub Pages deployment.

## Out of scope (for now)

- Cryptographically real/secure implementations of RSA/AES/DH — these are teaching visualizations with small numbers and simplified rounds, not production crypto.
- Any UI framework (React, Vue, etc.) or CSS framework.
- User accounts, persistence beyond the current browser session/URL permalink.
- ECC, real-time collaboration — noted as possible future ideas, not planned work.

## Reference material

The original project's planning docs (`Plan.md`, `READMEV2.md`) are kept in [legacy/](legacy/) for historical context; this file supersedes them as the current scope.
