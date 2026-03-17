import { WhiteboardEvent } from "./events";
import {
  createEdgeStyle,
  createGroupStyle,
  createInitialState,
  createNodeStyle,
  WhiteboardState,
} from "./state";

export class ReplayablReducerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayablReducerError";
  }
}

export function applyEvent(state: WhiteboardState, event: WhiteboardEvent): WhiteboardState {
  const next = cloneState(state);

  switch (event.type) {
    case "board.created": {
      next.board = {
        id: event.boardId,
        title: event.payload.title,
        description: event.payload.description,
      };
      ensureBranch(next, event.branchId, event.timestamp);
      break;
    }

    case "node.created": {
      next.nodes[event.payload.nodeId] = {
        id: event.payload.nodeId,
        kind: event.payload.kind,
        x: event.payload.x,
        y: event.payload.y,
        width: event.payload.width,
        height: event.payload.height,
        text: event.payload.text,
        style: createNodeStyle(event.payload.style),
        metadata: { ...(event.payload.metadata ?? {}) },
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      };
      delete next.deletedNodeIds[event.payload.nodeId];
      ensureBranch(next, event.branchId, event.timestamp);
      break;
    }

    case "node.updated": {
      const existing = next.nodes[event.payload.nodeId];
      if (!existing || next.deletedNodeIds[event.payload.nodeId]) {
        throw new ReplayablReducerError(`Cannot update missing node: ${event.payload.nodeId}`);
      }

      next.nodes[event.payload.nodeId] = {
        ...existing,
        ...pickPrimitiveChanges(event.payload.changes),
        style: event.payload.changes.style
          ? { ...existing.style, ...event.payload.changes.style }
          : existing.style,
        metadata: event.payload.changes.metadata
          ? { ...existing.metadata, ...event.payload.changes.metadata }
          : existing.metadata,
        updatedAt: event.timestamp,
      };
      break;
    }

    case "node.deleted": {
      if (next.nodes[event.payload.nodeId]) {
        next.deletedNodeIds[event.payload.nodeId] = true;
      }
      break;
    }

    case "edge.created": {
      if (!next.nodes[event.payload.fromNodeId] || next.deletedNodeIds[event.payload.fromNodeId]) {
        throw new ReplayablReducerError(`Cannot create edge from missing node: ${event.payload.fromNodeId}`);
      }
      if (!next.nodes[event.payload.toNodeId] || next.deletedNodeIds[event.payload.toNodeId]) {
        throw new ReplayablReducerError(`Cannot create edge to missing node: ${event.payload.toNodeId}`);
      }

      next.edges[event.payload.edgeId] = {
        id: event.payload.edgeId,
        fromNodeId: event.payload.fromNodeId,
        toNodeId: event.payload.toNodeId,
        label: event.payload.label,
        style: createEdgeStyle(event.payload.style),
        metadata: { ...(event.payload.metadata ?? {}) },
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      };
      delete next.deletedEdgeIds[event.payload.edgeId];
      break;
    }

    case "edge.updated": {
      const existing = next.edges[event.payload.edgeId];
      if (!existing || next.deletedEdgeIds[event.payload.edgeId]) {
        throw new ReplayablReducerError(`Cannot update missing edge: ${event.payload.edgeId}`);
      }

      next.edges[event.payload.edgeId] = {
        ...existing,
        label: event.payload.changes.label ?? existing.label,
        style: event.payload.changes.style
          ? { ...existing.style, ...event.payload.changes.style }
          : existing.style,
        metadata: event.payload.changes.metadata
          ? { ...existing.metadata, ...event.payload.changes.metadata }
          : existing.metadata,
        updatedAt: event.timestamp,
      };
      break;
    }

    case "edge.deleted": {
      if (next.edges[event.payload.edgeId]) {
        next.deletedEdgeIds[event.payload.edgeId] = true;
      }
      break;
    }

    case "group.created": {
      next.groups[event.payload.groupId] = {
        id: event.payload.groupId,
        title: event.payload.title,
        memberIds: [...event.payload.memberIds],
        style: createGroupStyle(event.payload.style),
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      };
      break;
    }

    case "branch.created": {
      next.branches[event.payload.newBranchId] = {
        id: event.payload.newBranchId,
        fromEventId: event.payload.fromEventId,
        title: event.payload.title,
        reason: event.payload.reason,
        createdAt: event.timestamp,
      };
      break;
    }

    case "proposal.created": {
      next.proposals[event.payload.proposalId] = {
        id: event.payload.proposalId,
        title: event.payload.title,
        description: event.payload.description,
        proposedEvents: event.payload.proposedEvents,
        createdAt: event.timestamp,
        createdBy: { ...event.actor },
        resolution: "pending",
        approvedEventIds: [],
      };
      break;
    }

    case "proposal.resolved": {
      const existing = next.proposals[event.payload.proposalId];
      if (!existing) {
        throw new ReplayablReducerError(`Cannot resolve missing proposal: ${event.payload.proposalId}`);
      }

      next.proposals[event.payload.proposalId] = {
        ...existing,
        resolution: event.payload.resolution,
        approvedEventIds: [...(event.payload.approvedEventIds ?? [])],
        note: event.payload.note,
      };
      break;
    }

    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }

  next.eventCount += 1;
  next.lastEventId = event.id;
  next.lastUpdatedAt = event.timestamp;
  return next;
}

export function replayEvents(events: WhiteboardEvent[], initial: WhiteboardState = createInitialState()): WhiteboardState {
  return events.reduce((state, event) => applyEvent(state, event), initial);
}

function ensureBranch(state: WhiteboardState, branchId: string, timestamp: string): void {
  if (!state.branches[branchId]) {
    state.branches[branchId] = {
      id: branchId,
      createdAt: timestamp,
    };
  }
}

function pickPrimitiveChanges(
  changes: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (key === "style" || key === "metadata") continue;
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function cloneState(state: WhiteboardState): WhiteboardState {
  return {
    board: state.board ? { ...state.board } : null,
    branches: { ...state.branches },
    nodes: { ...state.nodes },
    edges: { ...state.edges },
    groups: { ...state.groups },
    deletedNodeIds: { ...state.deletedNodeIds },
    deletedEdgeIds: { ...state.deletedEdgeIds },
    proposals: { ...state.proposals },
    eventCount: state.eventCount,
    lastEventId: state.lastEventId,
    lastUpdatedAt: state.lastUpdatedAt,
  };
}
