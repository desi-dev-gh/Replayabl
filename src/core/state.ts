import {
  DEFAULT_EDGE_STYLE,
  DEFAULT_GROUP_STYLE,
  DEFAULT_NODE_STYLE,
  EdgeStyle,
  GroupStyle,
  NodeKind,
  NodeStyle,
  WhiteboardEvent,
} from "./events";

export type Board = {
  id: string;
  title: string;
  description?: string;
};

export type Node = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  style: NodeStyle;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Edge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style: EdgeStyle;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: string;
  title?: string;
  memberIds: string[];
  style: GroupStyle;
  createdAt: string;
  updatedAt: string;
};

export type Proposal = {
  id: string;
  title?: string;
  description?: string;
  proposedEvents: WhiteboardEvent[];
  createdAt: string;
  createdBy: {
    type: string;
    id: string;
    label?: string;
  };
  resolution: "pending" | "approved" | "rejected" | "partially_approved";
  approvedEventIds: string[];
  note?: string;
};

export type Branch = {
  id: string;
  title?: string;
  fromEventId?: string;
  reason?: string;
  createdAt: string;
};

export type WhiteboardState = {
  board: Board | null;
  schemaVersion: number;
  branches: Record<string, Branch>;
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  groups: Record<string, Group>;
  deletedNodeIds: Record<string, true>;
  deletedEdgeIds: Record<string, true>;
  proposals: Record<string, Proposal>;
  eventCount: number;
  lastSequence: number;
  lastEventId?: string;
  lastUpdatedAt?: string;
};

export const createInitialState = (schemaVersion = 1): WhiteboardState => ({
  board: null,
  schemaVersion,
  branches: {},
  nodes: {},
  edges: {},
  groups: {},
  deletedNodeIds: {},
  deletedEdgeIds: {},
  proposals: {},
  eventCount: 0,
  lastSequence: 0,
  lastEventId: undefined,
  lastUpdatedAt: undefined,
});

export const createNodeStyle = (overrides?: Partial<NodeStyle>): NodeStyle => ({
  ...DEFAULT_NODE_STYLE,
  ...overrides,
});

export const createEdgeStyle = (overrides?: Partial<EdgeStyle>): EdgeStyle => ({
  ...DEFAULT_EDGE_STYLE,
  ...overrides,
});

export const createGroupStyle = (overrides?: Partial<GroupStyle>): GroupStyle => ({
  ...DEFAULT_GROUP_STYLE,
  ...overrides,
});
