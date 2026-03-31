import "./styles.css";

import { replayEvents, type Edge, type Group, type Proposal, type WhiteboardEvent, type WhiteboardState } from "../core";
import { seedWhiteboardEvents } from "../examples/demo-events";

const uiEvents: WhiteboardEvent[] = [];
let serverEvents: WhiteboardEvent[] = [...seedWhiteboardEvents];
let baseSeedState = replayEvents(seedWhiteboardEvents);

const API_BASE = "http://localhost:3001/api";

function getFullStream() {
  return [...serverEvents, ...uiEvents];
}

async function loadServerState() {
  try {
    const res = await fetch(`${API_BASE}/boards/board_1/branches/main/events`);
    if (res.ok) {
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        serverEvents = data.events;
        baseSeedState = replayEvents(serverEvents);
        uiEvents.length = 0; // Clear optimistic events since we have network truth
        render();
        return;
      }
    }
    // Seed new SQLite database on first run
    for (const ev of seedWhiteboardEvents) {
      await fetch(`${API_BASE}/events`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(ev) 
      });
    }
  } catch (e) {
    console.warn("Backend persistent API unavailable, falling back to local memory mode:", e);
  }
}
loadServerState();

function appendEvent(event: WhiteboardEvent) {
  uiEvents.push(event); // Optimistic local append
  
  fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  }).then(res => {
    if (res.status === 409) {
      console.error("OCC Conflict Detected! Reloading server state...");
      loadServerState(); // Resync on concurrency rejection
    }
  }).catch(() => {});
}

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("#app container not found");
}

const app = appElement;

type DragState = {
  nodeId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  didMove: boolean;
};

type EdgeDragState = {
  fromNodeId: string;
  pointerId: number;
  currentX: number;
  currentY: number;
};

let showingProposalPreview = Boolean(getCurrentProposal(baseSeedState));
let dragState: DragState | null = null;
let edgeDragState: EdgeDragState | null = null;
let suppressSurfaceClick = false;

// Time-Travel variables
let timeTravelSequence: number | null = null;

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
  const target = event.target as HTMLElement | null;
  const deleteBtn = target?.closest<HTMLElement>(".delete-btn");

  if (deleteBtn) {
    event.stopPropagation();
    return; // Handled by specific event listeners attached in render
  }

  const connector = target?.closest<HTMLElement>(".node-connector");

  if (connector) {
    event.stopPropagation();
    if (showingProposalPreview || timeTravelSequence !== null) return;
    
    const nodeId = connector.dataset.nodeId;
    const boardSurface = app.querySelector<HTMLElement>(".board-surface");
    if (!nodeId || !boardSurface) return;
    
    const rect = boardSurface.getBoundingClientRect();
    edgeDragState = {
      fromNodeId: nodeId,
      pointerId: event.pointerId,
      currentX: event.clientX - rect.left,
      currentY: event.clientY - rect.top,
    };
    connector.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  const nodeCard = getNodeCard(event.target);
  if (!nodeCard) {
    return;
  }

  event.stopPropagation();

  if (getNodeTextEditor(event.target) || showingProposalPreview) {
    return;
  }

  const nodeId = nodeCard.dataset.nodeId;
  if (!nodeId) {
    return;
  }

  const baseState = getBaseState();
  const node = baseState.nodes[nodeId];

  if (!node || baseState.deletedNodeIds[nodeId]) {
    return;
  }

  const boardSurface = nodeCard.closest<HTMLElement>(".board-surface");
  if (!boardSurface) {
    return;
  }

  const rect = boardSurface.getBoundingClientRect();
  dragState = {
    nodeId,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left - node.x,
    offsetY: event.clientY - rect.top - node.y,
    didMove: false,
  };

  nodeCard.setPointerCapture(event.pointerId);
  event.preventDefault();
});

app.addEventListener("pointermove", (event) => {
  if (edgeDragState && edgeDragState.pointerId === event.pointerId) {
    const boardSurface = app.querySelector<HTMLElement>(".board-surface");
    if (!boardSurface) return;
    
    const rect = boardSurface.getBoundingClientRect();
    edgeDragState.currentX = Math.max(0, event.clientX - rect.left);
    edgeDragState.currentY = Math.max(0, event.clientY - rect.top);
    
    edgeDragState.currentX = Math.max(0, event.clientX - rect.left);
    edgeDragState.currentY = Math.max(0, event.clientY - rect.top);
    render();
    return;
  }

  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const boardSurface = app.querySelector<HTMLElement>(".board-surface");
  if (!boardSurface) {
    return;
  }

  const rect = boardSurface.getBoundingClientRect();
  const baseState = getBaseState();
  const node = baseState.nodes[dragState.nodeId];

  if (!node || baseState.deletedNodeIds[dragState.nodeId]) {
    dragState = null;
    return;
  }

  const nextX = Math.max(0, Math.round(event.clientX - rect.left - dragState.offsetX));
  const nextY = Math.max(0, Math.round(event.clientY - rect.top - dragState.offsetY));

  if (nextX === node.x && nextY === node.y) {
    return;
  }

  dragState.didMove = true;

  appendEvent(createNodeUpdatedEvent(dragState.nodeId, {
    x: nextX,
    y: nextY,
  }, ["demo", "drag"]));

  render();
});

app.addEventListener("pointerup", endDrag);
app.addEventListener("pointercancel", endDrag);

app.addEventListener("click", (event) => {
  if (getNodeCard(event.target)) {
    event.stopPropagation();
  }
});

render();

function render(): void {
  const baseState = getBaseState();
  const proposals = Object.values(baseState.proposals);
  const currentProposal = getCurrentProposal(baseState);
  const proposalToShow = currentProposal ?? proposals[0];

  if (!currentProposal && showingProposalPreview) {
    showingProposalPreview = false;
  }

  const activeState = showingProposalPreview && currentProposal
    ? replayEvents(
        currentProposal.proposedEvents.map((evt, i) => ({
          ...evt,
          sequence: baseState.lastSequence + i + 1,
          parentEventId: i === 0 ? baseState.lastEventId : currentProposal.proposedEvents[i - 1].id,
        })),
        baseState
      )
    : baseState;
  const proposalButton = currentProposal
    ? `<button class="${showingProposalPreview ? "ghost-button" : "primary-button"}" data-action="toggle-preview">${showingProposalPreview ? "Show current state" : "Preview proposal"}</button>`
    : "";
  const eventStream = getFullStream();
  const isEditable = !showingProposalPreview && timeTravelSequence === null;

  const timeTravelBanner = timeTravelSequence !== null 
    ? `<div class="time-travel-banner">
         <span>Viewing historical state (Sequence ${timeTravelSequence})</span>
         <button class="primary-button" data-action="resume-present">Return to Present</button>
       </div>`
    : "";

  app.innerHTML = `
    <div class="shell">
      <section class="canvas-card">
        ${timeTravelBanner}
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
            ${renderEdges(activeState, isEditable)}
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

        ${proposalToShow ? renderProposalPanel(proposalToShow, proposalToShow.id === currentProposal?.id) : ""}

        <section class="panel">
          <div class="header-actions" style="margin-bottom: 8px;">
            <h3>Event stream</h3>
            <button class="ghost-button" data-action="simulate-ai">🪄 Simulate AI</button>
          </div>
          <p class="muted">The board is derived entirely by replaying these events. Click an event to time-travel.</p>
          <div class="event-list ${timeTravelSequence !== null ? "time-travel-active" : ""}">
            ${eventStream.map((ev) => renderEventItem(ev, timeTravelSequence)).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;

  app.querySelector<HTMLElement>("[data-action='toggle-preview']")?.addEventListener("click", () => {
    showingProposalPreview = !showingProposalPreview;
    dragState = null;
    render();
  });

  app.querySelector<HTMLElement>("[data-action='approve-proposal']")?.addEventListener("click", () => {
    const latestState = getBaseState();
    const proposal = getCurrentProposal(latestState);
    if (!proposal) {
      return;
    }

    approveProposal(proposal, latestState);
  });

  app.querySelector<HTMLElement>("[data-action='reject-proposal']")?.addEventListener("click", () => {
    const latestState = getBaseState();
    const proposal = getCurrentProposal(latestState);
    if (!proposal) {
      return;
    }

    rejectProposal(proposal, latestState);
  });

  app.querySelector<HTMLElement>(".board-surface")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget || showingProposalPreview || timeTravelSequence !== null) {
      return;
    }

    if (suppressSurfaceClick) {
      suppressSurfaceClick = false;
      return;
    }

    createNoteAt(event);
  });

  app.querySelectorAll<HTMLElement>("[data-action='time-travel']").forEach(el => {
    el.addEventListener("click", () => {
      const seq = el.dataset.sequence;
      if (seq) {
        timeTravelSequence = parseInt(seq, 10);
        showingProposalPreview = false;
        render();
      }
    });
  });

  app.querySelector<HTMLElement>("[data-action='resume-present']")?.addEventListener("click", () => {
    timeTravelSequence = null;
    render();
  });

  app.querySelector<HTMLElement>("[data-action='simulate-ai']")?.addEventListener("click", () => {
    simulateAIProposal();
  });

  app.querySelectorAll<HTMLElement>("[data-action='delete-node']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nodeId = btn.dataset.nodeId;
      if (!nodeId) return;
      
      const genId = () => Math.random().toString(36).substring(2, 9);
      const latestState = getBaseState();
      
      appendEvent({
        id: `evt_ui_${genId()}`,
        boardId: latestState.board?.id ?? "board_1",
        branchId: "main",
        parentEventId: latestState.lastEventId ?? null,
        sequence: latestState.lastSequence + 1,
        schemaVersion: 1,
        actor: { type: "human", id: "demo_user", label: "Demo user" },
        type: "node.deleted",
        timestamp: new Date().toISOString(),
        payload: { nodeId },
        meta: { source: "ui", approvalStatus: "not_required", tags: ["demo", "node-delete"] }
      } as Extract<WhiteboardEvent, { type: "node.deleted" }>);
      
      render();
    });
  });

  app.querySelectorAll<SVGElement>("[data-action='delete-edge']").forEach(btn => {
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const edgeId = btn.dataset.edgeId;
      if (!edgeId) return;
      
      const genId = () => Math.random().toString(36).substring(2, 9);
      const latestState = getBaseState();
      
      appendEvent({
        id: `evt_ui_${genId()}`,
        boardId: latestState.board?.id ?? "board_1",
        branchId: "main",
        parentEventId: latestState.lastEventId ?? null,
        sequence: latestState.lastSequence + 1,
        schemaVersion: 1,
        actor: { type: "human", id: "demo_user", label: "Demo user" },
        type: "edge.deleted",
        timestamp: new Date().toISOString(),
        payload: { edgeId },
        meta: { source: "ui", approvalStatus: "not_required", tags: ["demo", "edge-delete"] }
      } as Extract<WhiteboardEvent, { type: "edge.deleted" }>);
      
      render();
    });
  });

  // Inject persistent slider into the body so it survives DOM re-renders inside #app
  let sliderBox = document.getElementById("timeline-slider-box");
  if (!sliderBox) {
    sliderBox = document.createElement("div");
    sliderBox.id = "timeline-slider-box";
    sliderBox.className = "timeline-slider-box";
    sliderBox.innerHTML = `
      <div class="slider-controls" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; font-size: 13px;">
        <button id="slider-btn-prev" class="ghost-button" style="padding: 2px 8px; min-height: 24px;">&lt; Prev</button>
        <button id="slider-btn-next" class="ghost-button" style="padding: 2px 8px; min-height: 24px;">Next &gt;</button>
        <span id="slider-current-label" style="margin-left: 8px; font-variant-numeric: tabular-nums;">Present</span>
      </div>
      <div style="position: relative; width: 100%; display: flex; align-items: center; padding: 12px 0;">
        <div id="timeline-ticks" style="position: absolute; left: 8px; right: 8px; top: 50%; transform: translateY(-50%); display: flex; justify-content: space-between; z-index: 1; pointer-events: none; align-items: center;"></div>
        <input type="range" id="timeline-slider" min="0" value="0" step="1" style="width: 100%; position: relative; z-index: 2; margin: 0; background: transparent;" />
      </div>
    `;
    document.body.appendChild(sliderBox);

    document.getElementById("timeline-slider")?.addEventListener("input", (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      const stream = getFullStream();
      if (val === stream.length) {
        timeTravelSequence = null;
      } else if (val === 0) {
        timeTravelSequence = 0;
      } else {
        timeTravelSequence = stream[val - 1]?.sequence ?? null;
      }
      showingProposalPreview = false;
      render();
    });

    document.getElementById("slider-btn-prev")?.addEventListener("click", () => {
      const slider = document.getElementById("timeline-slider") as HTMLInputElement;
      if (slider) {
        slider.value = Math.max(0, parseInt(slider.value, 10) - 1).toString();
        slider.dispatchEvent(new Event("input"));
      }
    });

    document.getElementById("slider-btn-next")?.addEventListener("click", () => {
      const slider = document.getElementById("timeline-slider") as HTMLInputElement;
      if (slider) {
        slider.value = Math.min(parseInt(slider.max, 10), parseInt(slider.value, 10) + 1).toString();
        slider.dispatchEvent(new Event("input"));
      }
    });
  }

  const slider = document.getElementById("timeline-slider") as HTMLInputElement;
  if (slider) {
    const fullStream = getFullStream();
    slider.max = fullStream.length.toString();
    
    let indexValue = fullStream.length;
    if (timeTravelSequence !== null) {
      if (timeTravelSequence === 0) {
        indexValue = 0;
      } else {
        const idx = fullStream.findIndex((e) => e.sequence === timeTravelSequence);
        indexValue = idx >= 0 ? idx + 1 : fullStream.length;
      }
    }
    
    slider.value = indexValue.toString();

    // Draw tick markers
    const ticksContainer = document.getElementById("timeline-ticks");
    if (ticksContainer) {
       const steps = fullStream.length;
       if (steps > 0) {
         ticksContainer.innerHTML = Array.from({ length: steps + 1 }).map((_, i) => `<div style="width: 2px; height: ${i % 5 === 0 ? '12px' : '8px'}; background: ${i <= indexValue ? 'var(--blue-500)' : 'var(--gray-300)'}; border-radius: 1px; transition: background 0.15s;"></div>`).join("");
       } else {
         ticksContainer.innerHTML = "";
       }
    }
    
    const label = document.getElementById("slider-current-label");
    if (label) {
       if (timeTravelSequence === null) {
         label.textContent = "Present (Live)";
       } else if (timeTravelSequence === 0) {
         label.textContent = "Initial State";
       } else {
         const evt = fullStream.find(e => e.sequence === timeTravelSequence);
         if (evt) {
            const dt = new Date(evt.timestamp);
            label.textContent = `Seq ${timeTravelSequence} • ${dt.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})} • ${evt.type}`;
         } else {
            label.textContent = `Viewing Sequence ${timeTravelSequence}`;
         }
       }
    }
  }
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
        <article class="node-card" data-node-id="${escapeHtml(node.id)}" style="${style}">
          <span class="node-kind">${escapeHtml(node.kind)}</span>
          <div
            class="node-text"
            data-node-id="${escapeHtml(node.id)}"
            data-node-text-editor="true"
            contenteditable="${isEditable ? "true" : "false"}"
            spellcheck="false"
          >${escapeHtml(node.text ?? "")}</div>
          ${isEditable ? `
            <div class="node-connector" data-action="start-edge" data-node-id="${escapeHtml(node.id)}">+</div>
            <button class="delete-btn delete-node-btn" data-action="delete-node" data-node-id="${escapeHtml(node.id)}" aria-label="Delete node" title="Delete node">✕</button>
          ` : ""}
        </article>
      `;
    })
    .join("");

  return `<div class="nodes-layer">${nodeCards}</div>`;
}

function renderEdges(state: WhiteboardState, isEditable: boolean): string {
  const lines = Object.values(state.edges)
    .filter((edge) => !state.deletedEdgeIds[edge.id])
    .map((edge) => renderEdge(edge, state, isEditable))
    .join("");

  let tempLine = "";
  if (edgeDragState) {
    const from = state.nodes[edgeDragState.fromNodeId];
    if (from && !state.deletedNodeIds[from.id]) {
      const x1 = from.x + from.width;
      const y1 = from.y + from.height / 2;
      const x2 = edgeDragState.currentX;
      const y2 = edgeDragState.currentY;
      const cx = (x1 + x2) / 2;
      const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
      tempLine = `<path d="${path}" class="temp-edge" fill="none"></path>`;
    }
  }

  return `
    <svg class="edges-layer" viewBox="0 0 1120 720" width="1120" height="720" aria-label="whiteboard edges">
      <defs>
        <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#94A3B8"></polygon>
        </marker>
      </defs>
      ${lines}
      ${tempLine}
    </svg>
  `;
}

function renderEdge(edge: Edge, state: WhiteboardState, isEditable: boolean): string {
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
    ${isEditable ? `
      <g class="delete-btn delete-edge-btn" data-action="delete-edge" data-edge-id="${escapeHtml(edge.id)}" transform="translate(${cx}, ${y1 + (y2 - y1) / 2})" style="cursor: pointer;">
        <circle cx="0" cy="0" r="10" fill="#ef4444" />
        <text x="0" y="0" fill="white" font-size="12px" text-anchor="middle" dominant-baseline="central" pointer-events="none">✕</text>
      </g>
    ` : ""}
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

function renderProposalPanel(proposal: Proposal, isCurrentProposal: boolean): string {
  const actionButtons = isCurrentProposal
    ? `
      <div class="proposal-actions">
        <button class="primary-button" data-action="approve-proposal">Approve</button>
        <button class="ghost-button danger-button" data-action="reject-proposal">Reject</button>
      </div>
    `
    : "";

  return `
    <section class="panel proposal-card">
      <div>
        <h3>${escapeHtml(proposal.title ?? "Proposal")}</h3>
        <p class="muted">${escapeHtml(proposal.description ?? "")}</p>
      </div>
      <span class="proposal-status proposal-status--${escapeHtml(proposal.resolution)}">${escapeHtml(proposal.resolution)}</span>
      <p class="muted">Created by ${escapeHtml(proposal.createdBy.label ?? proposal.createdBy.id)} · ${proposal.proposedEvents.length} proposed event(s)</p>
      ${actionButtons}
      <div class="proposal-events">
        ${proposal.proposedEvents.map(renderProposedEventItem).join("")}
      </div>
    </section>
  `;
}

function approveProposal(proposal: Proposal, state: WhiteboardState): void {
  for (const event of proposal.proposedEvents) {
    const latestState = getBaseState();
    appendEvent(cloneProposalEvent(event, latestState));
  }
  
  appendEvent(createProposalResolvedEvent(proposal, "approved", proposal.proposedEvents.map((event) => event.id)));
  showingProposalPreview = false;
  dragState = null;
  render();
}

function rejectProposal(proposal: Proposal, _state: WhiteboardState): void {
  appendEvent(createProposalResolvedEvent(proposal, "rejected"));
  showingProposalPreview = false;
  dragState = null;
  render();
}

function cloneProposalEvent(event: WhiteboardEvent, state: WhiteboardState): WhiteboardEvent {
  return {
    ...event,
    boardId: state.board?.id ?? "board_1",
    parentEventId: state.lastEventId ?? null,
    sequence: state.lastSequence + 1,
    schemaVersion: 1,
    meta: {
      ...event.meta,
      source: "ui",
      approvalStatus: "approved",
    },
  };
}

function createNoteAt(event: MouseEvent): void {
  const boardSurface = event.currentTarget;

  if (!(boardSurface instanceof HTMLElement)) {
    return;
  }

  const rect = boardSurface.getBoundingClientRect();
  const nodeId = `node_note_${Math.random().toString(36).substring(2, 9)}`;
  const baseState = getBaseState();

  appendEvent({
    id: `evt_ui_${Math.random().toString(36).substring(2, 9)}`,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    sequence: baseState.lastSequence + 1,
    schemaVersion: 1,
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

  appendEvent(createNodeUpdatedEvent(nodeId, {
    text: nextText,
  }, ["demo", "inline-edit"]));

  render();
}

function createNodeUpdatedEvent(
  nodeId: string,
  changes: NonNullable<Extract<WhiteboardEvent, { type: "node.updated" }> ["payload"]>["changes"],
  tags: string[],
): Extract<WhiteboardEvent, { type: "node.updated" }> {
  const baseState = getBaseState();

  return {
    id: `evt_ui_${Math.random().toString(36).substring(2, 9)}`,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    sequence: baseState.lastSequence + 1,
    schemaVersion: 1,
    actor: {
      type: "human",
      id: "demo_user",
      label: "Demo user",
    },
    type: "node.updated",
    timestamp: new Date().toISOString(),
    payload: {
      nodeId,
      changes,
    },
    meta: {
      source: "ui",
      approvalStatus: "not_required",
      tags,
    },
  };
}

function createProposalResolvedEvent(
  proposal: Proposal,
  resolution: Extract<Proposal["resolution"], "approved" | "rejected" | "partially_approved">,
  approvedEventIds?: string[],
): Extract<WhiteboardEvent, { type: "proposal.resolved" }> {
  // We need to re-evaluate base state right at creation time, as events may have been pushed during approval
  const baseState = getBaseState();

  return {
    id: `evt_ui_${Math.random().toString(36).substring(2, 9)}`,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    sequence: baseState.lastSequence + 1,
    schemaVersion: 1,
    actor: {
      type: "human",
      id: "demo_user",
      label: "Demo user",
    },
    type: "proposal.resolved",
    timestamp: new Date().toISOString(),
    payload: {
      proposalId: proposal.id,
      resolution,
      approvedEventIds,
    },
    meta: {
      source: "ui",
      approvalStatus: "not_required",
      tags: ["demo", "proposal-resolution"],
    },
  };
}

function endDrag(event: PointerEvent): void {
  if (edgeDragState && edgeDragState.pointerId === event.pointerId) {
    const connector = event.target as HTMLElement | null;
    if (connector?.hasPointerCapture(event.pointerId)) {
      connector.releasePointerCapture(event.pointerId);
    }
    
    // Temporarily hide connector to find what's underneath it
    if (connector) connector.style.pointerEvents = 'none';
    const targetEl = document.elementFromPoint(event.clientX, event.clientY);
    if (connector) connector.style.pointerEvents = '';
    
    // Find if we dropped on another node or connector
    const targetNodeCard = getNodeCard(targetEl);
    const targetConnector = targetEl?.closest ? targetEl.closest(".node-connector") as HTMLElement : null;
    
    // Determine target ID either from card or the connector directly
    const toNodeId = targetConnector?.dataset.nodeId || targetNodeCard?.dataset.nodeId;
    
    const baseState = getBaseState();
    const genId = () => Math.random().toString(36).substring(2, 9);
    const edgeId = `edge_${genId()}`;
    
    if (toNodeId && toNodeId !== edgeDragState.fromNodeId) {
      appendEvent({
        id: `evt_ui_${genId()}`,
        boardId: baseState.board?.id ?? "board_1",
        branchId: "main",
        parentEventId: baseState.lastEventId ?? null,
        sequence: baseState.lastSequence + 1,
        schemaVersion: 1,
        actor: { type: "human", id: "demo_user", label: "Demo user" },
        type: "edge.created",
        timestamp: new Date().toISOString(),
        payload: {
          edgeId,
          fromNodeId: edgeDragState.fromNodeId,
          toNodeId
        },
        meta: { source: "ui", approvalStatus: "not_required", tags: ["demo", "link-drag"] }
      } as Extract<WhiteboardEvent, { type: "edge.created" }>);
    }
    // If dropped on empty space (!toNodeId), we ignore the interaction intentionally.
    
    edgeDragState = null;
    suppressSurfaceClick = true;
    render();
    return;
  }

  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const nodeCard = getNodeCard(event.target);
  if (nodeCard?.hasPointerCapture(event.pointerId)) {
    nodeCard.releasePointerCapture(event.pointerId);
  }

  suppressSurfaceClick = dragState.didMove;
  dragState = null;
}

function simulateAIProposal(): void {
  const baseState = getBaseState();
  const visibleNodes = Object.values(baseState.nodes).filter(n => !baseState.deletedNodeIds[n.id]);
  
  if (visibleNodes.length === 0) return;
  
  const targetNode = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
  const proposalId = `proposal_sim_${Math.random().toString(36).substring(2, 9)}`;
  const genId = () => Math.random().toString(36).substring(2, 9);
  
  const newNodeId = `node_${genId()}`;
  const edgeId = `edge_${genId()}`;
  
  const proposalEvent: Extract<WhiteboardEvent, { type: "proposal.created" }> = {
    id: `evt_ui_${genId()}`,
    boardId: baseState.board?.id ?? "board_1",
    branchId: "main",
    parentEventId: baseState.lastEventId ?? null,
    sequence: baseState.lastSequence + 1,
    schemaVersion: 1,
    actor: { type: "llm", id: "simulated_agent", label: "Agent" },
    type: "proposal.created",
    timestamp: new Date().toISOString(),
    payload: {
      proposalId,
      title: "Expand thoughts",
      description: "I suggest expanding on this note with a generated follow-up thought.",
      proposedEvents: [
        {
          id: `evt_sim_${genId()}`,
          boardId: baseState.board?.id ?? "board_1",
          branchId: "main",
          parentEventId: baseState.lastEventId ?? null,
          sequence: baseState.lastSequence + 2,
          schemaVersion: 1,
          actor: { type: "llm", id: "simulated_agent", label: "Agent" },
          type: "node.created",
          timestamp: new Date().toISOString(),
          payload: {
            nodeId: newNodeId,
            kind: "note",
            x: targetNode.x + targetNode.width + 60,
            y: targetNode.y,
            width: 180,
            height: 100,
            text: "AI generated follow-up",
            style: { backgroundColor: "#ECFCCB", borderColor: "#10B981" }
          },
          meta: { source: "agent", approvalStatus: "pending" }
        } as Extract<WhiteboardEvent, { type: "node.created" }>,
        {
          id: `evt_sim_${genId()}`,
          boardId: baseState.board?.id ?? "board_1",
          branchId: "main",
          parentEventId: null, // intentionally skipping causal ref internally for sim simplicity
          sequence: baseState.lastSequence + 3,
          schemaVersion: 1,
          actor: { type: "llm", id: "simulated_agent", label: "Agent" },
          type: "edge.created",
          timestamp: new Date().toISOString(),
          payload: {
            edgeId: edgeId,
            fromNodeId: targetNode.id,
            toNodeId: newNodeId,
            label: "implies",
            style: { color: "#10B981", lineStyle: "dashed" }
          },
          meta: { source: "agent", approvalStatus: "pending" }
        } as Extract<WhiteboardEvent, { type: "edge.created" }>
      ]
    },
    meta: { source: "agent", approvalStatus: "not_required" }
  };

  appendEvent(proposalEvent);
  render();
}

function getNodeCard(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  return target.closest<HTMLElement>("[data-node-id]");
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
  const fullStream = getFullStream();
  
  if (timeTravelSequence !== null) {
    if (timeTravelSequence === 0) return replayEvents([]);
    const historicalStream = fullStream.filter(e => e.sequence === undefined || e.sequence <= timeTravelSequence!);
    return replayEvents(historicalStream);
  }

  return uiEvents.length > 0
    ? replayEvents(uiEvents, baseSeedState)
    : baseSeedState;
}

function getCurrentProposal(state: WhiteboardState): Proposal | undefined {
  return Object.values(state.proposals).find((proposal) => proposal.resolution === "pending");
}

function renderEventItem(event: WhiteboardEvent, currentSequence: number | null): string {
  const isFuture = currentSequence !== null && event.sequence !== undefined && event.sequence > currentSequence;
  const isSelected = currentSequence !== null && event.sequence === currentSequence;
  
  return `
    <div class="event-item ${isFuture ? 'event-item--future' : ''} ${isSelected ? 'event-item--selected' : ''}" 
         data-action="time-travel" 
         data-sequence="${event.sequence}">
      <p><strong>${escapeHtml(event.type)}</strong></p>
      <span class="muted mono">seq:${event.sequence} · ${escapeHtml(event.actor.label ?? event.actor.id)}</span>
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
