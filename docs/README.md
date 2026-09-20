# Docs

- [scope.md](scope.md) — vision, and what's in/out of scope for the rebuild.
- `architecture.md` — added once the core engine is designed (module contract, folder layout).
- [diagrams/](diagrams/) — wireframes, user-flow sketches, architecture diagrams:
  - `architecture.png` — module map: how app.js, cipherRegistry, stepEngine, historyStack, and the UI layer talk to each other.
  - `cipher-contract.png` — before/after: today's `switch(activeCipher)` block vs. the registry + generator module contract.
  - `ui-wireframe.png` — layout regions of the new `index.html` shell.
  - `step-flow.png` — the step/rewind state machine.
- [legacy/](legacy/) — original university-project planning docs (`Plan.md`, `READMEV2.md`), kept for reference only.
- `roadmap.md` — local-only checkpoint checklist (gitignored, not part of this repo's history).
