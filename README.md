# Architecture

## Overview

Replayabl is a framework vision for building replay-first applications where humans and LLMs collaborate through a shared, inspectable, branchable history.

The core architectural improvement is this:

Humans and LLMs should share the same action grammar, but they should not write canonical events directly.

Instead:

1. clients submit commands or proposals
2. a validation and policy boundary decides what is allowed
3. the system emits committed events
4. state is derived by deterministic replay

This keeps the replay log trustworthy, keeps the execution model deterministic, and gives Replayabl a clean boundary for approval, authorization, and safety checks.

---

## Recommended Runtime Boundaries

Replayabl should be organized around five runtime boundaries rather than six loose conceptual layers:

1. Ingress Layer
2. Validation + Policy Layer
3. Event Store + Branch Registry
4. Replay + Projection Layer
5. Representation + Adapter Layer

These are implementation boundaries, not just concepts.

---

## 1. Ingress Layer

The ingress layer receives input from:

- humans through UI interactions
- LLMs through structured proposals
- imports from external formats
- system automation

Important rule:

Ingress should produce commands, drafts, or proposals, not committed events.

Why:

- LLM output is untrusted input
- UI actions may still need normalization
- authorization and approval decisions should happen before append
- replay logs should contain only validated, canonical events

Examples:

- `CreateNodeCommand`
- `MoveNodeCommand`
- `CreateBranchCommand`
- `SubmitProposalCommand`

---

## 2. Validation + Policy Layer

This layer is the trust boundary of the system.

Responsibilities:

- schema validation
- domain validation
- authorization
- approval policy
- normalization
- safety checks for model-generated actions
- risk scoring for sensitive operations

This is where Replayabl decides whether a command becomes:

- a committed event
- a pending proposal
- a rejected action

Important rule:

Validation should happen before append, not only during replay.

The replay engine should still defend its invariants, but malformed or unauthorized actions should ideally never enter the canonical history.

Security-sensitive checks to make explicit:

- actor identity and role
- allowed action types per actor
- payload size limits
- allowed targets within a branch or document
- approval gates for risky or destructive actions
- provenance completeness for model-generated actions

---

## 3. Event Store + Branch Registry

Committed events are the source of truth.

Suggested canonical event shape:

- `id`
- `boardId` or document id
- `branchId`
- `type`
- `timestamp`
- `actor`
- `payload`
- `parentEventId` for causality
- `sequence` or append order for deterministic replay
- `schemaVersion`
- `meta` for provenance and policy decisions

The branch model should be explicit.

Recommended branch fields:

- `branchId`
- `parentBranchId`
- `forkEventId`
- `headEventId`
- `createdAt`
- `createdBy`
- `reason`

Important rule:

Branches should not be only implicit side effects of replay. They should be first-class records with clear fork points and heads.

This avoids ambiguity when comparing histories, switching branches, restoring snapshots, or merging.

---

## 4. Replay + Projection Layer

Application state is derived by replaying committed events through deterministic reducers or interpreters.

Requirements:

- deterministic execution
- predictable ordering rules
- explicit error handling for invalid histories
- pure replay from the same snapshot + event stream
- domain-specific projections for read models and UI views

Replay should be treated as a pure engine.

That means:

- no policy decisions during replay
- no network access during replay
- no hidden randomness or time-dependent behavior
- no dependency on prompt formats or UI state

This layer can expose multiple projections:

- current branch state
- proposal preview state
- timeline inspection views
- diff views between branches
- audit projections by actor or provenance

---

## 5. Snapshot Layer

Snapshots are an optimization for replay, not the source of truth.

Snapshot responsibilities:

- reduce replay cost
- support fast loading
- preserve deterministic restoration
- support branch-specific restore points

Recommended snapshot metadata:

- `snapshotId`
- `branchId`
- `baseEventId`
- `schemaVersion`
- `createdAt`
- integrity hash

Likely strategy:

- periodic full snapshots first
- optional incremental snapshots later
- restore from nearest checkpoint and replay forward

---

## 6. Collaboration Model

Replayabl becomes human+AI-native when collaboration is modeled explicitly rather than hidden inside generic events.

Capabilities:

- branch creation
- branch comparison
- merge or cherry-pick workflows
- proposal review
- approval and rejection
- annotations on history
- provenance inspection

Important rule:

Proposals should not be canonical events containing nested canonical events.

A better model is:

- proposals are drafts or review objects
- approved proposals materialize ordinary committed events into a branch
- rejection leaves an audit trail without contaminating the canonical event log

This keeps review state separate from committed history and avoids recursive event structures.

Merge should be treated as domain-specific.

Replayabl can provide merge infrastructure, but each app domain should define what a safe or meaningful merge means.

---

## 7. Representation + Adapter Layer

Event histories may be stored or exchanged in multiple representations, but these should be adapters around the runtime, not core runtime layers.

TOON is a promising candidate for:

- prompt serialization
- project export/import
- debugging
- human-readable diffs
- compact history sharing

A pragmatic model:

- runtime: native typed objects + event storage
- interchange: TOON or JSON
- prompt context: TOON when it improves model efficiency
- audit/debug export: TOON or JSON

Important rule:

The runtime should not depend on any single representation format.

The action grammar matters more than TOON, JSON, or any other wire syntax.

---

## End-to-End Flow

Recommended flow:

1. UI, agent, or importer submits a command
2. validation + policy checks the command
3. the system emits committed events or stores a proposal
4. events are appended to the event store on a branch
5. replay and projections derive state for UI and inspection
6. snapshots accelerate future loads

For AI-assisted work:

1. the model submits a structured proposal
2. the proposal is validated and risk-checked
3. the user previews the projected result
4. approval commits ordinary events to a branch

---

## First Reference App Candidates

Strong early candidates remain:

- whiteboard / diagram editor
- slide builder
- workflow builder
- form builder

These are still the best starting points because they have:

- clear action vocabularies
- manageable replay semantics
- obvious branch and review workflows
- lower complexity than raster-heavy creative tools

Avoid heavy creative tools first if they require complex rendering pipelines before the action model is proven.

---

## Key Risks To Address Early

- event noise from high-frequency UI gestures such as drag
- unclear branch ordering or fork semantics
- mixing proposal state with committed state
- over-coupling runtime logic to TOON or prompt formats
- weak provenance for LLM-generated operations
- attempting generic merge before domain rules exist

---

## Open Questions

- What is the minimal canonical event envelope for all apps?
- Which fields belong in command metadata versus committed event metadata?
- What proposal model best supports preview, approval, and partial approval?
- How should sequence ordering work across branches?
- Which merge capabilities can be framework-level versus domain-level?
- When should TOON be preferred over compact JSON?
- What should be part of core versus app-specific plugins?
