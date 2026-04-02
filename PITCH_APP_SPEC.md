# Infra-Graph: Replayabl Pitch Application Specification

## 1. Vision & Purpose: The AI-Native Engineering Base
"Infra-Graph" is a conceptual Cloud Architecture Builder designed specifically to pitch the **Replayabl** framework to CTOs and technical leadership as the ultimate base for **Engineering Design** applications. 

Currently, the industry standard is to bolt AI onto legacy applications using adapters like **MCP (Model Context Protocol)**. This results in "puppeteering"—the AI blindly pulls levers on opaque state machines designed for mouse clicks, not LLM token generation. 

**Infra-Graph demonstrates a fundamentally different approach: an AI-Native Shared Substrate.** 
Both data and user interaction share the same execution and collaboration aspect. When a human drags an EC2 instance onto the canvas, they emit a `NodeCreated` command. When the LLM decides to add a load balancer, it emits the *exact same* command. Both pass through the same Validation Layer. Both are appended to the same Event Tree. 

Infra-Graph uses strict domain rules (cloud infrastructure) to demonstrate Replayabl's 5 Core Principles:
1. **CRDTs / Causal Ordering:** Real-time human-AI collaboration without locking.
2. **Bounded Context (Snapshots):** Scalable LLM prompting.
3. **Ephemeral State:** Dropping UI noise (drag events) from the canonical log.
4. **JSON Schema over TOON:** Reliable, validated AI event generation.
5. **Compensating Actions:** Graceful handling of rejected/rewound side-effects.

The goal is to prove that Replayabl is a secure, deterministic runtime for AI agents operating in high-stakes enterprise environments.

---

## 2. Tech Stack
*   **Core Framework:** Replayabl (existing `src/core/framework.ts`, `events.ts`, `reducer.ts`)
*   **UI Framework:** React 18 + TypeScript + Vite
*   **Canvas Engine:** `@xyflow/react` (React Flow) for high-performance, node-based interactive graphs.
*   **Styling:** Tailwind CSS + Radix UI Colors (clean, enterprise SaaS aesthetic).
*   **Icons:** `lucide-react` (standardized vector icons for infrastructure).
*   **State Management:** Zustand (for binding the Replayabl engine to React components without unnecessary re-renders).

---

## 3. Domain Model (Adapting `events.ts`)

The existing whiteboard node kinds will be extended/replaced with infrastructure-specific types:

**Node Kinds:**
*   `compute` (e.g., EC2, Lambda)
*   `database` (e.g., RDS, DynamoDB)
*   `storage` (e.g., S3)
*   `network` (e.g., VPC, API Gateway)

**Edge Types:**
*   `connection` (network flow)
*   `permission` (IAM/Access flow)

**Events:**
We will utilize the existing `NodeCreated`, `NodeUpdated`, `EdgeCreated`, `ProposalCreated`, and `ProposalResolved` events. We will introduce `PolicyRejected` (as a meta-event or UI state) to demonstrate the Validation Layer.

---

## 4. UI/UX Architecture

The application will feature a 3-pane desktop layout:

### A. Left Sidebar: Component Palette
*   Draggable icons for Compute, Database, Storage, and Network.
*   "Ephemeral State" is active here: dragging an item over the canvas broadcasts presence, but only dropping it emits a canonical `NodeCreatedEvent`.

### B. Center Canvas: The Projection (React Flow)
*   The visual representation of the *derived state* (the Replayabl projection).
*   Nodes are custom React Flow components rendering Tailwind-styled cards with Lucide icons.
*   **Proposal Overlay:** When an AI proposal is pending, proposed nodes/edges appear as semi-transparent, dashed-border "ghosts" (e.g., tinted green for additions, red for deletions).

### C. Right Panel: Collaboration & Audit Log
*   **Top Half (Audit Trail):** A scrolling, cryptographic-style log of canonical events.
    *   *Example:* `[10:02:14] NodeCreated (RDS-1) by Human-Dev-1`
    *   *Example:* `[10:05:00] NodeUpdated (RDS-1: Scale Up) by AI-Agent-GPT4o (Approved by Human-Dev-1)`
*   **Bottom Half (AI Copilot / Proposals):** 
    *   Input box for "Ask AI to update infrastructure..."
    *   Mocked AI actions (e.g., buttons like "Make DB Highly Available" or "Expose to Public").
    *   Pending proposals show up here with explicit **[Approve]** and **[Reject]** buttons.

### D. Bottom Bar: Timeline / Time Travel
*   A scrubber/slider representing the sequence of events.
*   Dragging the slider backwards instantly recalculates the derived state.
*   Demonstrates the generation of *Compensating Actions* if applied.

---

## 5. Core Pitch Workflows (The Demo Script)

### Scenario 1: The "Human-in-the-Loop" (Proposals vs. Commits)
1.  Human clicks: "AI Copilot: Make database highly available."
2.  The mock AI generates a `ProposalCreatedEvent` containing 3 actions: `CreateNode (Replica)`, `CreateNode (Load Balancer)`, `CreateEdge (Routing)`.
3.  The canvas updates to show these 3 nodes as *holograms* (green dashed lines).
4.  The Event Log shows a pending proposal. The main state *is not mutated*.
5.  Human clicks **[Approve]**. The proposal resolves, events are appended to the canonical log, and the holograms become solid.

### Scenario 2: The "Safety & Validation" Moment
1.  Human clicks: "AI Copilot: Make S3 Bucket Public."
2.  The mock AI attempts to generate an event modifying the storage node's permissions.
3.  The Replayabl Validation Layer intercepts this based on domain rules.
4.  The UI flashes a rejection: `Policy Violation: S3 buckets cannot have public read access.`
5.  The canonical event log remains pristine. 

### Scenario 3: The "Auditability" Moment
1.  User clicks on the newly created Database Replica node.
2.  The right panel highlights the exact event that created it, displaying the full provenance (Actor: AI, Approver: Human, Timestamp, Schema Version).

---

## 6. Implementation Plan (Step-by-Step)

1.  **Dependencies:** Install `@xyflow/react`, `lucide-react`, `zustand`, `tailwindcss`, `clsx`, `tailwind-merge`.
2.  **Model Updates:** Update `src/core/events.ts` to include cloud infrastructure types and ensure `compensatesEventId` is available.
3.  **UI Shell & Setup:** Initialize Tailwind, set up the 3-pane layout in `App.tsx` or a dedicated demo component.
4.  **Canvas Integration:** Build the custom React Flow nodes (`ComputeNode`, `DatabaseNode`, etc.) and the Zustand store to bridge `framework.ts` state to React Flow nodes/edges.
5.  **Event Ingress & Reducer:** Wire up the drag-and-drop from the palette to emit `NodeCreated` events.
6.  **Proposal Engine UI:** Build the right panel. Implement the logic to visually diff the current state vs. the proposed state (rendering the "holograms").
7.  **Mock AI Actions:** Wire up the "Make HA" and "Make Public" buttons to simulate LLM structured JSON output hitting the validation layer.
