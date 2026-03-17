# Roadmap

## Phase 0 — Clarify the Thesis

- Finalize core framing
- Define what Replayabl is and is not
- Choose the first reference app
- Decide TOON’s role: storage, interchange, prompt layer, or all three

## Phase 1 — Core Model

- Define base event schema
- Define branch model
- Define replay semantics
- Define snapshot strategy
- Define validation pipeline

## Phase 2 — Minimal Runtime

- Event append/read APIs
- Branch creation
- Replay engine
- Snapshot restore
- Basic history inspection

## Phase 3 — Agent/Human Collaboration

- AI action proposal flow
- Validation + approval flow
- Event provenance UI
- Branch comparison
- Action preview before commit

## Phase 4 — First Reference App

Recommended candidates:

- whiteboard / diagram editor
- slide builder
- workflow editor

Success criteria:

- human and AI can both create/edit using same action schema
- state can be replayed deterministically
- branches can be explored and compared
- core architecture feels better than ad-hoc tool wrapping

## Phase 5 — Developer Experience

- SDK for defining actions
- app scaffolding templates
- plugin model for renderers / reducers
- TOON serialization helpers
- documentation and examples

## Phase 6 — Ecosystem

- more reference apps
- adapters to import/export legacy data
- diff/merge tooling
- hosted collaboration layer
