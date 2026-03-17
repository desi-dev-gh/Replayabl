# Architecture

## Overview

Replayabl is a framework vision for building replay-first applications where humans and LLMs operate on the same event history.

The architecture has six logical layers:

1. Event Layer
2. Replay Layer
3. Snapshot Layer
4. Collaboration Layer
5. Representation Layer
6. UI + Agent Layer

---

## 1. Event Layer

Every meaningful action is recorded as an event.

Suggested base shape:

- `id`
- `actorType` (`human`, `llm`, `system`)
- `actorId`
- `actionType`
- `targetType`
- `targetId`
- `params`
- `timestamp`
- `branchId`
- `parentEventId`
- `validationStatus`
- `provenance`

Example event categories:

- creation events
- mutation events
- layout events
- content generation events
- approval / rejection events
- system normalization events

---

## 2. Replay Layer

Application state is derived from replaying events through deterministic reducers or interpreters.

Requirements:

- deterministic execution
- schema validation before replay
- idempotency where possible
- predictable ordering rules
- explicit error handling for invalid events

---

## 3. Snapshot Layer

Long event histories need checkpoints.

Snapshot responsibilities:

- reduce replay cost
- support fast loading
- preserve deterministic restoration
- enable branch-specific restore points

Likely strategy:

- periodic full snapshots
- optional incremental snapshots
- replay from nearest checkpoint forward

---

## 4. Collaboration Layer

This is where Replayabl becomes human+AI-native.

Capabilities:

- branching
- compare branches
- merge branches
- approve / reject AI-generated actions
- annotate event history
- inspect provenance

Important rule:

Human and LLM actions should be represented in the same action grammar, not in separate systems.

---

## 5. Representation Layer

Event histories may be stored or exchanged in multiple representations.

TOON is a promising candidate for:

- prompt serialization
- project export/import
- debugging
- human-readable diffs
- compact event history sharing

But internal runtime storage does not have to be TOON-only.

A pragmatic model:

- runtime: native typed objects + database storage
- interchange: TOON
- prompt context: TOON
- audit/debug export: TOON or JSON

---

## 6. UI + Agent Layer

Two primary event producers:

- humans through interface interactions
- LLMs through structured action proposals

The system should support:

- direct human actions
- AI-proposed actions
- preview before commit
- approval gates for risky operations
- explanation for AI-generated actions

---

## First Reference App Candidates

Strong early candidates:

- whiteboard / diagram editor
- slide builder
- workflow builder
- form builder

Avoid heavy creative tools first if they require complex raster pipelines before the action model is proven.

---

## Open Questions

- What is the minimal universal event schema?
- Should merge be domain-specific?
- How much provenance should be required by default?
- What should be part of core vs app-specific plugins?
- When should TOON be preferred over compact JSON?
