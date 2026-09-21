# Docs

## Running locally

No build step — `index.html` is a static page loaded with native ES modules (`<script type="module">`), so it needs to be served over `http://`, not opened directly as a `file://` URL (browsers block module imports from `file://`).

- **VS Code**: install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, then right-click `index.html` → "Open with Live Server".
- **Any other editor**: run a static server from the project root, e.g. `npx serve .` or `python -m http.server`, then open the printed `localhost` URL.

`DataEncrypt.html` (the original single-file app, still being migrated from) can be opened directly as a `file://` URL, since it has no module scripts.

## Docs index

- [scope.md](scope.md) — vision, and what's in/out of scope for the rebuild.
- [architecture.md](architecture.md) — cipher module contract, folder layout, runtime data flow.
- [diagrams/](diagrams/) — wireframes, user-flow sketches, architecture diagrams:
  - `architecture.png` — module map: how app.js, cipherRegistry, stepEngine, historyStack, and the UI layer talk to each other.
  - `cipher-contract.png` — before/after: today's `switch(activeCipher)` block vs. the registry + generator module contract.
  - `ui-wireframe.png` — layout regions of the new `index.html` shell.
  - `step-flow.png` — the step/rewind state machine.
- [legacy/](legacy/) — original university-project planning docs (`Plan.md`, `READMEV2.md`), kept for reference only.
- `roadmap.md` — local-only checkpoint checklist (gitignored, not part of this repo's history).
