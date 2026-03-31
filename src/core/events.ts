export type ActorType = "human" | "llm" | "system";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "not_required";

export type ActorRef = {
  type: ActorType;
  id: string;
  label?: string;
};

export type EventMeta = {
  source?: "ui" | "agent" | "import" | "system";
  reasoning?: string;
  approvalStatus?: ApprovalStatus;
  tags?: string[];
};

export type EventEnvelope<TType extends string, TPayload> = {
  id: string;
  boardId: string;
  branchId: string;
  parentEventId?: string | null;
  sequence?: number; // Added for OCC
  schemaVersion?: number; // Added for Upcasters
  actor: ActorRef;
  type: TType;
  timestamp: string;
  payload: TPayload;
  meta?: EventMeta & { isEncrypted?: boolean };
};

export type NodeKind = "note" | "shape" | "textBlock" | "image" | "codeBlock";

export type NodeStyle = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
  borderRadius: number;
  fontSize: number;
  fontWeight: "normal" | "medium" | "bold";
};

export type EdgeStyle = {
  color: string;
  width: number;
  lineStyle: "solid" | "dashed" | "dotted";
  arrowStart?: "none" | "arrow";
  arrowEnd?: "none" | "arrow";
};

export type GroupStyle = {
  backgroundColor: string;
  borderColor: string;
  borderStyle: "solid" | "dashed";
  titleColor: string;
};

export type BoardCreated = {
  title: string;
  description?: string;
};

export type NodeCreated = {
  nodeId: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  style?: Partial<NodeStyle>;
  metadata?: Record<string, unknown>;
};

export type NodeUpdated = {
  nodeId: string;
  changes: {
    text?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    style?: Partial<NodeStyle>;
    metadata?: Record<string, unknown>;
  };
};

export type NodeDeleted = {
  nodeId: string;
};

export type EdgeCreated = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: Partial<EdgeStyle>;
  metadata?: Record<string, unknown>;
};

export type EdgeUpdated = {
  edgeId: string;
  changes: {
    label?: string;
    style?: Partial<EdgeStyle>;
    metadata?: Record<string, unknown>;
  };
};

export type EdgeDeleted = {
  edgeId: string;
};

export type GroupCreated = {
  groupId: string;
  title?: string;
  memberIds: string[];
  style?: Partial<GroupStyle>;
};

export type BranchCreated = {
  newBranchId: string;
  fromEventId: string;
  title?: string;
  reason?: string;
};

export type ProposalCreated = {
  proposalId: string;
  title?: string;
  description?: string;
  proposedEvents: WhiteboardEvent[];
};

export type ProposalResolved = {
  proposalId: string;
  resolution: "approved" | "rejected" | "partially_approved";
  approvedEventIds?: string[];
  note?: string;
};

export type BoardCreatedEvent = EventEnvelope<"board.created", BoardCreated>;
export type NodeCreatedEvent = EventEnvelope<"node.created", NodeCreated>;
export type NodeUpdatedEvent = EventEnvelope<"node.updated", NodeUpdated>;
export type NodeDeletedEvent = EventEnvelope<"node.deleted", NodeDeleted>;
export type EdgeCreatedEvent = EventEnvelope<"edge.created", EdgeCreated>;
export type EdgeUpdatedEvent = EventEnvelope<"edge.updated", EdgeUpdated>;
export type EdgeDeletedEvent = EventEnvelope<"edge.deleted", EdgeDeleted>;
export type GroupCreatedEvent = EventEnvelope<"group.created", GroupCreated>;
export type BranchCreatedEvent = EventEnvelope<"branch.created", BranchCreated>;
export type ProposalCreatedEvent = EventEnvelope<"proposal.created", ProposalCreated>;
export type ProposalResolvedEvent = EventEnvelope<"proposal.resolved", ProposalResolved>;

export type WhiteboardEvent =
  | BoardCreatedEvent
  | NodeCreatedEvent
  | NodeUpdatedEvent
  | NodeDeletedEvent
  | EdgeCreatedEvent
  | EdgeUpdatedEvent
  | EdgeDeletedEvent
  | GroupCreatedEvent
  | BranchCreatedEvent
  | ProposalCreatedEvent
  | ProposalResolvedEvent;

export const DEFAULT_NODE_STYLE: NodeStyle = {
  backgroundColor: "#FFF6A5",
  textColor: "#1F2937",
  borderColor: "#EAB308",
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: "normal",
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  color: "#6B7280",
  width: 2,
  lineStyle: "solid",
  arrowStart: "none",
  arrowEnd: "arrow",
};

export const DEFAULT_GROUP_STYLE: GroupStyle = {
  backgroundColor: "#F9FAFB",
  borderColor: "#D1D5DB",
  borderStyle: "dashed",
  titleColor: "#111827",
};
