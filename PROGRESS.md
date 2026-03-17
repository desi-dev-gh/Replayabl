# Replayabl Progress

_Last updated: 2026-03-17_

## Current state

Replayabl exists as an early TypeScript prototype in `D:\Replayabl` with:

- a typed event model
- replay-based whiteboard state reducer
- a tiny browser demo built with Vite + TypeScript
- local UI event accumulation on top of seeded demo events
- proposal preview + approve/reject flow

The project has moved beyond concept docs and now has a minimal interactive proof of the core thesis.

---

## What works right now

### Core model
- `src/core/events.ts`
  - typed event envelope
  - whiteboard event types
  - actor/provenance metadata
- `src/core/state.ts`
  - board/node/edge/group/proposal state types
- `src/core/reducer.ts`
  - deterministic event application
  - replay from event stream

### Browser demo
- renders seeded whiteboard state from replayed events
- renders nodes and edges
- shows proposal panel
- supports proposal preview
- supports click-to-create note nodes
- supports inline node text editing
- supports dragging nodes
- supports proposal approve/reject

### Build status
- `npm run typecheck` passes
- `npm run build` passes

---

## Important design decisions so far

### Chosen approach
- **Option B**: prototype in TypeScript first, move stable core to Rust later
- Rust is still the likely long-term home for the core runtime
- TypeScript is currently being used to validate:
  - action model
  - event tree shape
  - replay behavior
  - human + AI collaboration UX

### Product framing
Replayabl is **not** just “apps storing data in TOON”.

It is:
- a replay-first application architecture
- where humans and LLMs work on the same explicit event history
- with TOON as a possible representation/interchange/prompt layer

### First reference domain
- current prototype direction: **whiteboard / diagram editor**
- chosen because it has a clean event vocabulary and is easier than image editing

---

## Key commits so far

- `0659376` — Add initial TypeScript event model and reducer
- `a94cd55` — feat: add minimal whiteboard browser demo
- `d7706af` — feat(demo): create note nodes on empty canvas click
- `93ee345` — feat(demo): support inline node text editing
- `2100532` — feat(demo): support dragging existing nodes
- `8285c7c` — feat(demo): resolve proposals from the browser

---

## Current limitations

### Data/storage
- everything is currently in-memory for the browser demo
- refreshing the page resets locally created UI events
- no persistence yet

### Event flow
- dragging currently emits one `node.updated` event per pointer move
- this is architecturally honest, but noisy
- no event compaction / coalescing yet

### Proposal system
- current UI assumes a single active pending proposal
- no multi-proposal queue/history UX
- preview is read-only by design

### Whiteboard features
- no node connection creation from UI yet
- no group creation from UI yet
- no branch creation/switching UI yet
- no event timeline scrubber
- no save/load
- no TOON export/import

---

## Recommended next steps

### Highest-value next step
1. **Save/load event history**
   - export current event stream
   - import saved event stream
   - ideally JSON first, TOON later

### After that
2. **TOON export/import**
   - prove TOON’s role in the workflow, not just in theory

3. **Branch creation + branch switcher**
   - this is central to the Replayabl thesis

4. **Connect nodes from the UI**
   - start turning it into a usable whiteboard instead of movable sticky notes

5. **Event compaction strategy for drag**
   - maybe keep raw events, but create presentation/session compaction for practicality

---

## Medium-term direction

Once the action model and UX feel stable:

- freeze the core semantics
- identify the stable engine boundary
- move core pieces to Rust:
  - event model
  - validation
  - replay engine
  - snapshots
  - branch logic
  - TOON codec

Then keep TypeScript for:
- browser demo
- docs/playground
- reference app UI

---

## Working thesis to keep in mind

Replayabl is trying to prove this:

> Applications should be built so humans and LLMs can operate on the same replayable action history, instead of AI being bolted onto opaque legacy flows.

That is the real product idea.
Not “TOON everywhere.”
Not “yet another AI wrapper.”

---

## If picking this up later

Start here:
1. Run the demo
   - `npm install`
   - `npm run dev`
2. Verify current interactions still work
   - create node
   - edit node text
   - drag node
   - preview proposal
   - approve/reject proposal
3. Then work on **save/load event history** next

---

## Nice-to-have docs to add later

Potential future files:
- `TOON_ROLE.md`
- `EVENT_MODEL.md`
- `BRANCHING.md`
- `RUST_MIGRATION_PLAN.md`
- `REFERENCE_APP_WHITEBOARD.md`
