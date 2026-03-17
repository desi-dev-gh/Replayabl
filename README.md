<<<<<<< HEAD
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
- UI actions may still need normalization (e.g., debouncing high-frequency events like dragging into momentary drafts)
- authorization and approval decisions should happen before append
- replay logs should contain only validated, canonical events
- ingress must defend against DoS by enforcing strict payload size and depth limits

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

To support AI workflows, the validation boundary should not just return a boolean, but a structured outcome (e.g., a `Result` type) containing detailed failure reasons. This allows the framework to feed rejection contexts back to the LLM for self-correction.

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

To ensure system integrity, the event store must mandate **Optimistic Concurrency Control (OCC)**. Commands must target a specific `parentEventId` or `sequence`, explicitly rejecting writes that operate on stale state.

Additionally, to support data privacy (GDPR/CCPA) in an immutable log, the framework should recommend **Crypto-Shredding**. Sensitive PII stored in payloads should be encrypted with a unique key per user/tenant, allowing the data to be "deleted" by dropping the key.

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

- **Upcaster pattern support:** mutating old event payloads into the latest `schemaVersion` in memory before they hit reducers
- **Output sanitization:** projections must sanitize output before rendering to protect against prompt injection or malicious payloads being evaluated
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
- provenance inspection

Important rule:

Proposals should not be canonical events containing nested canonical events.
- approved proposals materialize ordinary committed events into a branch
- rejection leaves an audit trail without contaminating the canonical event log

This keeps review state separate from committed history and avoids recursive event structures.

Merge should be treated as domain-specific.


Event histories may be stored or exchanged in multiple representations, but these should be adapters around the runtime, not core runtime layers.

- debugging
- compact history sharing

A pragmatic model:

- runtime: native typed objects + event storage (ensuring secrets and PII are stripped)
- interchange: TOON or JSON
- prompt context: TOON when it improves model efficiency

---


1. UI, agent, or importer submits a command
2. validation + policy checks the command
3. the system emits committed events or stores a proposal
4. events are appended to the event store on a branch
5. replay and projections derive state for UI and inspection
6. snapshots accelerate future loads

For AI-assisted work:
---

## First Reference App Candidates
Strong early candidates remain:

- whiteboard / diagram editor
- slide builder
- workflow builder
- form builder

## Key Risks To Address Early

- event noise from high-frequency UI gestures such as drag
- unclear branch ordering or fork semantics
- mixing proposal state with committed state
- over-coupling runtime logic to TOON or prompt formats
- weak provenance for LLM-generated operations
- attempting generic merge before domain rules exist

- How should sequence ordering work across branches?
- Which merge capabilities can be framework-level versus domain-level?
- When should TOON be preferred over compact JSON?
- What should be part of core versus app-specific plugins?
=======
# Replayabl


Instead of bolting AI onto legacy tools through adapters, Replayabl explores a different idea:

> What if the application itself was designed so that both humans and models could understand, generate, inspect, replay, and refine the same sequence of actions?

Replayabl is a framework vision for **AI-native applications** built on **event trees**, with a structured representation layer such as **TOON** for compact, LLM-friendly histories.

- AI interacts through APIs, tools, or MCP adapters
- the underlying application state is often opaque
- workflows are difficult to replay, audit, or branch
- AI actions feel bolted on rather than native

- humans and LLMs both operate on the same action substrate
- histories can be inspected, forked, compared, approved, and replayed



That means:

- every action is explicit
- every state can be reconstructed
- every edit has provenance
- every AI-generated step can be reviewed
An LLM becomes another.

Both contribute to the same project history.
Humans and LLMs can both contribute actions to the same project.

### Replayability
Try multiple alternatives without losing prior work.
### Auditability
Know which actions came from a human, which came from a model, and why.

### Recoverability
Undo, redo, compare, revert, and repair become natural.

### AI-native workflows

In an event-native app, the history is primary.

For example, an image editor might record actions like:

- import image
- crop layer
- add text
- move layer
- export

A human might do the first few steps.

An LLM might propose the next few.
The system can then:

- validate the actions
- show a preview
- let the human approve or modify them
- branch into alternate versions
- replay the result at any point
## Why TOON

Replayabl is interested in **TOON (Token-Oriented Object Notation)** as a possible representation for action histories.
- structured
- human-readable
- LLM-friendly
- well-suited to repeated event streams and uniform records

That said, **TOON is not the product**.

- explicit events
- deterministic replay
- branchable histories
- shared human/AI interaction model

TOON is one possible serialization layer for storage, interchange, prompt context, and debugging.

---

## How This Differs From MCP

MCP makes existing tools callable.

That is useful, but it still assumes the tool was built in an older human-first model.

Replayabl explores a different approach:

> Don’t just make legacy tools usable by AI.  
> Build tools whose action model is already understandable to both humans and AI.
That means:

- no translation layer as the core idea
- no fragile GUI puppeteering
- no AI bolted awkwardly onto opaque state
- state is derived
- collaboration is native

### 1. Events are the source of truth
State should be reproducible from history.

Every operation should be typed, inspectable, and validatable.

### 3. Human and AI share the same substrate
AI collaboration needs “try this instead” as a normal flow.
### 6. Provenance matters
Every event should record who or what produced it.


## Best First Apps

Replayabl should probably **not** start by rebuilding Photoshop.

Better first candidates:

- whiteboard / diagram editor
- slide builder
- workflow editor
- form builder

These domains have:

- clearer action vocabularies
- easier replay models
- obvious collaboration patterns
- lower implementation complexity

The first reference app should prove the architecture, not exhaust it.

---

## Non-Goals

At least for the beginning, Replayabl is **not** trying to:

- replace JSON everywhere
- create a universal storage format religion
- rebuild every popular application at once
- make a generic chatbot wrapper
- automate everything without oversight

This is about building a better substrate for shared human+AI work.

---

## Tiny Browser Demo

A minimal local whiteboard demo now ships in this repo.

Run it with:

```bash
npm install
npm run dev
```

Then open the local Vite URL in a browser. The demo:

- replays a seeded whiteboard event stream into state
- renders nodes, edges, and proposal-generated groups
- shows a proposal panel with proposed events
- lets you toggle between the current committed state and a proposal preview

## Current Status

This is an idea in progress.

The hard parts are still open:

- action grammar design
- replay semantics
- branch and merge strategy
- deterministic model-assisted operations
- TOON’s role in storage vs interchange vs prompting
- choosing the right first reference app

That’s the point of the project.

---

## Guiding Question

> What would it look like to build applications where humans and LLMs work on the same explicit, replayable history instead of through separate interfaces and adapters?

That’s the experiment.
>>>>>>> 0659376 (Add initial TypeScript event model and reducer)
