import "./styles.css";

import { replayEvents, type Edge, type Group, type Proposal, type WhiteboardEvent, type WhiteboardState } from "../core";
import { seedWhiteboardEvents } from "../examples/demo-events";

const uiEvents: WhiteboardEvent[] = [];
const baseSeedState = replayEvents(seedWhiteboardEvents);

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("#app container not found");
}

const app = appElement;

let showingProposalPreview = Boolean(Object.keys(baseSeedState.proposals).length);

app.addEventListener("focusin", (event) => {
  const editor = getNodeTextEditor(event.target);
  if (!editor) {
    return;
  }

  editor.dataset.initialText = getEditorText(editor);
});

app.addEventListener("focusout", (event) => {
  const editor = getNodeTextEditor(event.target);
  if (!editor) {
    return;
  }

  commitNodeTextEdit(editor);
});

app.addEventListener("keydown", (event) => {
  const editor = getNodeTextEditor(event.target);
  if (!editor) {
    return;
  }

  if (event.key === "Escape") {
    editor.textContent = editor.dataset.initialText ?? "";
    editor.blur();
    return;
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    editor.blur();
  }
});

app.addEventListener("pointerdown", (event) => {
  if (getNodeTextEditor(event.target)) {
    event.stopPropagation();
  }
});

app.addEventListener("click", (event) => {
  if (getNodeTextEditor(event.target)) {
    event.stopPropagation();
  }
});

render();

function render(): void {
  const baseState = getBaseState();
  const proposals = Object.values(baseState.proposals);
  const firstProposal = proposals[0];
  const activeState = showingProposalPreview && firstProposal
    ? replayEvents(firstProposal.proposedEvents, baseState)
    : baseState;
  const proposalButton = firstProposal
    ? `<button class="${showingProposalPreview ? "ghost-button" : "primary-button"}" data-action="toggle-preview">${showingProposalPreview ? "Show current state" : "Preview proposal"}</button>`
    : "";
  const eventStream = [...seedWhiteboardEvents, ...uiEvents];
  const isEditable = !showingProposalPreview;

  app.innerHTML = `
    <div class="shell">
      <section class="canvas-card">
        <div class="header">
          <div>
            <h1>${escapeHtml(activeState.board?.title ?? "Untitled board")}</h1>
            <p class="muted">${escapeHtml(activeState.board?.description ?? "Replay state rendered from a deterministic event stream.")}</p>
          </div>
          <div class="header-actions">
            ${proposalButton}
          </div>
        </div>
        <div class="canvas-wrap">
          <div class="board-surface">
            ${renderEdges(activeState)}
            ${renderGroups(activeState)}
            ${renderNodes(activeState, isEditable)}
          </div>
        </div>
      </section>

      <aside class="sidebar-card">
        <section class="panel">
          <h2>Replay snapshot</h2>
          <p class="muted">Minimal browser UI over the existing TypeScript reducer and event model.</p>
          <div class="kpis">
            <div class="kpi"><span class="muted">events</span><strong>${activeState.eventCount}</strong></div>
            <div class="kpi"><span class="muted">branches</span><strong>${Object.keys(activeState.branches).length}</strong></div>
            <div class="kpi"><span class="muted">nodes</span><strong>${visibleNodeCount(activeState)}</strong></div>
            <div class="kpi"><span class="muted">edges</span><strong>${visibleEdgeCount(activeState)}</strong></div>
          </div>
        </section>

        ${firstProposal ? renderProposalPanel(firstProposal) : ""}

        <section class="panel">
          <h3>Event stream</h3>
          <p class="muted">The board is derived entirely by replaying these events.</p>
          <div class="event-list">
            ${eventStream.map(renderEventItem).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;

  app.querySelector<HTMLElement>("[data-action='toggle-preview']")?.addEventListener("click", () => {
    showingProposalPreview = !showingProposalPreview;
    render();
  });

  app.querySelector<HTMLElement>(".board-surface")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    createNoteAt(event);
  });
}

function renderNodes(state: WhiteboardState, isEditable: boolean): string {
  const nodeCards = Object.values(state.nodes)
    .filter((node) => !state.deletedNodeIds[node.id])
    .map((node) => {
      const style = [
        `left:${node.x}px`,
        `top:${node.y}px`,
        `width:${node.width}px`,
        `height:${node.height}px`,
        `background:${node.style.backgroundColor}`,
        `color:${node.style.textColor}`,
        `border-color:${node.style.borderColor}`,
        `border-width:${node.style.borderWidth}px`,
        `border-style:${node.style.borderStyle}`,
        `border-radius:${node.style.borderRadius}px`,
        `font-size:${node.style.fontSize}px`,
        `font-weight:${node.style.fontWeight}`,
      ].join(";");

      return `
        <article class="node-card" style="${style}">
          <span class="node-kind">${escapeHtml(node.kind)}</span>
          <div
            class="node-text"
            data-node-id="${escapeHtml(node.id)}"
            data-node-text-editor="true"
            contenteditable="${isEditable ? "true" : "false"}"
            spellcheck="false"
          >${escapeHtml(node.text ?? "")}</div>
        </article>
      `;
    })
    .join("");

  return `<div class="nodes-layer">${nodeCards}</div>`;
}

function renderEdges(state: WhiteboardState): string {
  const lines = Object.values(state.edges)
    .filter((edge) => !state.deletedEdgeIds[edge.id])
    .map((edge) => renderEdge(edge, state))
    .join("");

  return `
    <svg class="edges-layer" viewBox="0 0 1120 720" width="1120" height="720" aria-label="whiteboard edges">
      <defs>
        <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#94A3B8"></polygon>
        </marker>
      </defs>
      ${lines}
    </svg>
  `;
}

function renderEdge(edge: Edge, state: WhiteboardState): string {
  const from = state.nodes[edge.fromNodeId];
  const to = state.nodes[edge.toNodeId];

  if (!from || !to || state.deletedNodeIds[from.id] || state.deletedNodeIds[to.id]) {
    return "";
  }

  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const cx = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  const dash = edge.style.lineStyle === "dashed" ? "8 6" : edge.style.lineStyle === "dotted" ? "2 6" : "";
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - 10;

  return `
    <path d="${path}" fill="none" stroke="${edge.style.color}" stroke-width="${edge.style.width}" ${dash ? `stroke-dasharray="${dash}"` : ""} marker-end="url(#arrowhead)"></path>
    ${edge.label ? `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="edge-label">${escapeHtml(edge.label)}</text>` : ""}
  `;
}

function renderGroups(state: WhiteboardState): string {
  const groupBoxes = Object.values(state.groups)
    .map((group) => renderGroup(group, state))
    .join("");

  return `<div class="groups-layer">${groupBoxes}</div>`;
}

function renderGroup(group: Group, state: WhiteboardState): string {
  const members = group.memberIds
    .map((memberId) => state.nodes[memberId])
    .filter((node): node is NonNullable<typeof node> => Boolean(node) && !state.deletedNodeIds[node.id]);

  if (members.length === 0) {
    return "";
  }

  const padding = 30;
  const left = Math.min(...members.map((member) => member.x)) - padding;
  const top = Math.min(...members.map((member) => member.y)) - padding;
  const right = Math.max(...members.map((member) => member.x + member.width)) + padding;
  const bottom = Math.max(...members.map((member) => member.y + member.height)) + padding;

  return `
    <section class="group-box" style="left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px;border-color:${group.style.borderColor};background:${group.style.backgroundColor};border-style:${group.style.borderStyle};color:${group.style.titleColor}">
      <div class="group-title">${escapeHtml(group.title ?? "Group")}</div>
    </section>
  `;
}

function renderProposalPanel(proposal: Proposal): string {
  return `
    <section class="panel proposal-card">
      <div>
        <h3>${escapeHtml(proposal.title ?? "Proposal")}</h3>
        <p class="muted">${escapeHtml(proposal.description ?? "")}</p>
      </div>
      <span class="proposal-status">${escapeHtml(proposal.resolution)}</span>
      <p class="muted">Created by ${escapeHtml(proposal.createdBy.label ?? proposal.createdBy.id)} · ${proposal.proposedEvents.length} proposed event(s)</p>
      <div class="proposal-events">
        ${proposal.proposedEvents.map(renderProposedEventItem).join("")}
      </div>
    </section>
  `;
}

function createNoteAt(event: MouseEvent): void {
  const boardSurface = event.currentTarget;

  if (!(boardSurface instanceof HTMLElement)) {
    return;
  }

  const rect = boardSurface.getBoundingClientRect();
  const nodeId = `node_note_${uiEvents.length + 1}`;
  const eventId = `event_ui_node_created_${uiEvents.length + 1}`;
  const baseState = getBaseState();

  uiEvents.push({
    id: eventId,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    actor: {
      type: "human",
      id: "demo_user",
      label: "Demo user",
    },
    type: "node.created",
    timestamp: new Date().toISOString(),
    payload: {
      nodeId,
      kind: "note",
      x: Math.max(24, Math.round(event.clientX - rect.left - 80)),
      y: Math.max(24, Math.round(event.clientY - rect.top - 56)),
      width: 160,
      height: 112,
      text: "New note",
    },
    meta: {
      source: "ui",
      approvalStatus: "not_required",
      tags: ["demo", "click-create"],
    },
  });

  render();
}

function commitNodeTextEdit(editor: HTMLElement): void {
  const nodeId = editor.dataset.nodeId;

  if (!nodeId) {
    return;
  }

  const baseState = getBaseState();
  const node = baseState.nodes[nodeId];

  if (!node || baseState.deletedNodeIds[nodeId]) {
    return;
  }

  const nextText = getEditorText(editor);
  const previousText = node.text ?? "";

  if (nextText === previousText) {
    return;
  }

  uiEvents.push({
    id: `event_ui_node_updated_${uiEvents.length + 1}`,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    actor: {
      type: "human",
      id: "demo_user",
      label: "Demo user",
    },
    type: "node.updated",
    timestamp: new Date().toISOString(),
    payload: {
      nodeId,
      changes: {
        text: nextText,
      },
    },
    meta: {
      source: "ui",
      approvalStatus: "not_required",
      tags: ["demo", "inline-edit"],
    },
  });

  render();
}

function getNodeTextEditor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest<HTMLElement>("[data-node-text-editor='true']");
}

function getEditorText(editor: HTMLElement): string {
  return editor.textContent?.replace(/\r\n/g, "\n").trim() ?? "";
}

function getBaseState(): WhiteboardState {
  return uiEvents.length > 0
    ? replayEvents(uiEvents, baseSeedState)
    : baseSeedState;
}

function renderEventItem(event: WhiteboardEvent): string {
  return `
    <div class="event-item">
      <p><strong>${escapeHtml(event.type)}</strong></p>
      <span class="muted mono">${escapeHtml(event.id)} · ${escapeHtml(event.actor.label ?? event.actor.id)}</span>
    </div>
  `;
}

function renderProposedEventItem(event: Proposal["proposedEvents"][number]): string {
  return `
    <div class="proposal-event">
      <p><strong>${escapeHtml(event.type)}</strong></p>
      <span class="muted mono">${escapeHtml(event.id)} · ${escapeHtml(event.actor.label ?? event.actor.id)}</span>
    </div>
  `;
}

function visibleNodeCount(state: WhiteboardState): number {
  return Object.values(state.nodes).filter((node) => !state.deletedNodeIds[node.id]).length;
}

function visibleEdgeCount(state: WhiteboardState): number {
  return Object.values(state.edges).filter((edge) => !state.deletedEdgeIds[edge.id]).length;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
