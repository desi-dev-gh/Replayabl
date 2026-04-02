# Replayabl

Instead of bolting AI onto legacy tools through adapters, Replayabl explores a different idea:

> What if the application itself was designed so that both humans and models could understand, generate, inspect, replay, and refine the same sequence of actions?

Replayabl is a framework vision for **AI-native applications** built on **event trees**. It applies Event Sourcing and CQRS to Human-AI collaboration. 

The core architectural improvement is this:
Humans and LLMs share the same action grammar, but they **do not** write canonical events directly.

Instead:
1. clients submit commands or proposals
2. a validation and policy boundary decides what is allowed
3. the system emits committed events
4. state is derived by deterministic replay

This keeps the replay log trustworthy, execution deterministic, and gives Replayabl a clean boundary for approval, authorization, and safety checks.

---

## The 5 Core Principles for AI-Native Architecture

To realize this vision and handle the realities of LLM collaboration, Replayabl adopts the following architectural stances:

### 1. CRDTs and Causal Ordering over Strict OCC
While linear OCC (Optimistic Concurrency Control) is easy to model, it creates massive friction in real-time AI collaboration. If a human moves a node while an LLM is generating a 5-second `MoveNode` proposal, strict OCC will reject the LLM's work as stale. Instead, the framework embraces **Conflict-free Replicated Data Types (CRDTs)** and causal ordering (e.g., Lamport timestamps) in the projection layer to merge non-conflicting human and AI events cleanly.

### 2. Snapshots Solve the Context Window Problem
You cannot feed a 10,000-event history into an LLM prompt. The **Snapshot Layer** is a first-class citizen for LLM prompting. The standard way to prompt the LLM is `[Latest Snapshot State] + [Last N Events]`, ensuring the model always has deterministic, bounded context without losing the "why" of recent actions.

### 3. Ephemeral State Absorbs Event Noise
Event noise from high-frequency UI gestures (like dragging or cursor movement) degrades the event log. The framework defines an **Ephemeral State Layer**. High-frequency actions never reach the Ingress Layer as commands; they are broadcast via WebRTC/WebSockets for immediate visual feedback, and only emit a single canonical command (e.g., `NodeMoved`) when the interaction completes.

### 4. JSON Schema Over Custom Serialization (e.g., TOON)
While custom structured notations (like TOON) optimize for token efficiency, modern LLMs are heavily fine-tuned for structured JSON output. Replayabl strictly prefers **JSON and JSON Schema** for the core event payloads, relying on guaranteed valid event generation to drastically reduce the burden on the Validation Layer.

### 5. First-Class Compensating Actions
Pure state replay is easy, but applications have side effects (e.g., triggering a webhook, sending an email). You cannot "un-send" an email by deleting an event. Replayabl defines a semantic model for **Compensating Actions**—if a branch is rejected or time-traveled backwards, the framework emits explicit compensating events to handle external side-effects gracefully.

---

## Runtime Boundaries

Replayabl is organized around these implementation boundaries:

1. **Ingress Layer:** Receives input (from humans or LLMs) as *commands* or *proposals*, not committed events.
2. **Validation + Policy Layer:** The trust boundary. Enforces schema, authorization, and AI safety checks. Returns structured rejection contexts to allow LLMs to self-correct.
3. **Event Store + Branch Registry:** The source of truth. Uses causal ordering. Branches are explicit, first-class records (not just implicit replay side-effects).
4. **Replay + Projection Layer:** Derives application state via deterministic reducers. Merges histories cleanly.
5. **Snapshot Layer:** Essential for both fast application loading and bounded LLM context windows.

---

## How This Differs From MCP (Model Context Protocol)

MCP makes existing tools callable. It assumes the tool was built in an older human-first model.

Replayabl explores a different approach:
> Don't just make legacy tools usable by AI.
> Build tools whose action model is already understandable to both humans and AI.

That means:
- no translation layer as the core idea
- no fragile GUI puppeteering
- no AI bolted awkwardly onto opaque state
- state is derived natively
- collaboration is native, with explicit proposals and branches

---

## Best First Apps

Replayabl should probably **not** start by rebuilding Photoshop.

Better first candidates:
- whiteboard / diagram editor
- slide builder
- workflow editor
- form builder

These domains have clearer action vocabularies, easier replay models, and obvious collaboration patterns.

---

## Tiny Browser Demo

A minimal local whiteboard demo ships in this repo.

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
