import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ReactFlow, Background, Controls,
  Node as FlowNode, Edge as FlowEdge,
  applyNodeChanges, applyEdgeChanges,
  Connection, ReactFlowProvider,
  NodeChange, EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Cpu, Settings, Square, Activity, PlaySquare,
  AlertTriangle, CheckCircle, XCircle, Server,
  Database, HardDrive, Network, Code, List,
  Zap, Bot, User, GitBranch, Shield,
} from "lucide-react";
import { create } from "zustand";

import "./styles.css";
import { Framework } from "../core/framework";
import {
  WhiteboardEvent, NodeKind, EdgeCreatedEvent,
  NodeCreatedEvent, ProposalCreatedEvent,
  ProposalResolvedEvent, NodeUpdatedEvent,
} from "../core/events";

// ─── Framework bootstrap ────────────────────────────────────────────────────

const buildCloudSeed = (): WhiteboardEvent[] => {
  const t = (s: number) => new Date(Date.now() - (10 - s) * 4000).toISOString();
  const human = { id: "dev1", type: "human" as const };
  const sys   = { id: "system", type: "system" as const };

  const webId  = "node_web";
  const apiId  = "node_api";
  const dbId   = "node_db";
  const cacheId = "node_cache";
  const cdnId  = "node_cdn";

  return [
    { id: "c1", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(1), actor: sys,
      payload: { nodeId: webId,   kind: "compute",  x: 320, y: 180, width: 160, height: 60, text: "Web Server" } } as NodeCreatedEvent,
    { id: "c2", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(2), actor: human,
      payload: { nodeId: apiId,   kind: "compute",  x: 560, y: 180, width: 160, height: 60, text: "API Gateway" } } as NodeCreatedEvent,
    { id: "c3", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(3), actor: human,
      payload: { nodeId: dbId,    kind: "database", x: 560, y: 340, width: 160, height: 60, text: "Primary DB" } } as NodeCreatedEvent,
    { id: "c4", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(4), actor: human,
      payload: { nodeId: cacheId, kind: "storage",  x: 320, y: 340, width: 160, height: 60, text: "Redis Cache" } } as NodeCreatedEvent,
    { id: "c5", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(5), actor: sys,
      payload: { nodeId: cdnId,   kind: "network",  x: 100, y: 180, width: 160, height: 60, text: "CDN / Edge" } } as NodeCreatedEvent,
    { id: "c6", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(6), actor: human,
      payload: { edgeId: "ce1", fromNodeId: cdnId,  toNodeId: webId  } } as EdgeCreatedEvent,
    { id: "c7", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(7), actor: human,
      payload: { edgeId: "ce2", fromNodeId: webId,  toNodeId: apiId  } } as EdgeCreatedEvent,
    { id: "c8", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(8), actor: human,
      payload: { edgeId: "ce3", fromNodeId: apiId,  toNodeId: dbId   } } as EdgeCreatedEvent,
    { id: "c9", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(9), actor: human,
      payload: { edgeId: "ce4", fromNodeId: apiId,  toNodeId: cacheId } } as EdgeCreatedEvent,
  ];
};

const buildIndustrialSeed = (): WhiteboardEvent[] => {
  const t = (s: number) => new Date(Date.now() - (10 - s) * 4000).toISOString();
  const human = { id: "eng1", type: "human" as const };
  const sys   = { id: "system", type: "system" as const };

  const motorId    = "node_motor";
  const gearboxId  = "node_gearbox";
  const shaftId    = "node_shaft";
  const sensorId   = "node_sensor";
  const controlId  = "node_control";

  return [
    { id: "i1", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(1), actor: sys,
      payload: { nodeId: motorId,   kind: "motor",  x: 100, y: 200, width: 160, height: 60, text: "Drive Motor" } } as NodeCreatedEvent,
    { id: "i2", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(2), actor: human,
      payload: { nodeId: gearboxId, kind: "gear",   x: 320, y: 200, width: 160, height: 60, text: "Gearbox" } } as NodeCreatedEvent,
    { id: "i3", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(3), actor: human,
      payload: { nodeId: shaftId,   kind: "beam",   x: 540, y: 200, width: 160, height: 60, text: "Output Shaft" } } as NodeCreatedEvent,
    { id: "i4", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(4), actor: human,
      payload: { nodeId: sensorId,  kind: "sensor", x: 320, y: 360, width: 160, height: 60, text: "Torque Sensor" } } as NodeCreatedEvent,
    { id: "i5", boardId: "board_1", branchId: "main", type: "node.created", timestamp: t(5), actor: sys,
      payload: { nodeId: controlId, kind: "sensor", x: 100, y: 360, width: 160, height: 60, text: "PLC Controller" } } as NodeCreatedEvent,
    { id: "i6", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(6), actor: human,
      payload: { edgeId: "ie1", fromNodeId: motorId,   toNodeId: gearboxId } } as EdgeCreatedEvent,
    { id: "i7", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(7), actor: human,
      payload: { edgeId: "ie2", fromNodeId: gearboxId, toNodeId: shaftId   } } as EdgeCreatedEvent,
    { id: "i8", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(8), actor: human,
      payload: { edgeId: "ie3", fromNodeId: gearboxId, toNodeId: sensorId  } } as EdgeCreatedEvent,
    { id: "i9", boardId: "board_1", branchId: "main", type: "edge.created", timestamp: t(9), actor: human,
      payload: { edgeId: "ie4", fromNodeId: sensorId,  toNodeId: controlId } } as EdgeCreatedEvent,
  ];
};

const framework = new Framework(buildCloudSeed());

type StoreState = {
  events: WhiteboardEvent[];
  addEvent: (e: WhiteboardEvent) => void;
};

const useStore = create<StoreState>((set) => {
  framework.subscribe((_s: any, events: WhiteboardEvent[]) => {
    set({ events: [...(events || framework.getEvents())] });
  });
  return {
    events: framework.getEvents(),
    addEvent: (e: WhiteboardEvent) => framework.appendEvent(e),
  };
});

// ─── Node colours (deterministic from nodeId) ───────────────────────────────

const NODE_COLORS = ["#38bdf8","#a78bfa","#fb7185","#34d399","#f59e0b","#f97316","#22c55e","#60a5fa"];
const colorFromId = (id: string) =>
  NODE_COLORS[Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0) % NODE_COLORS.length];

// ─── Node type → icon/label ─────────────────────────────────────────────────

const NODE_META: Record<string, { icon: React.ElementType; label: string; bg: string }> = {
  motor:    { icon: Cpu,       label: "Motor",    bg: "rgba(56,189,248,0.08)"  },
  gear:     { icon: Settings,  label: "Gear",     bg: "rgba(167,139,250,0.08)" },
  beam:     { icon: Square,    label: "Beam",     bg: "rgba(251,113,133,0.08)" },
  sensor:   { icon: Activity,  label: "Sensor",   bg: "rgba(52,211,153,0.08)"  },
  compute:  { icon: Server,    label: "Compute",  bg: "rgba(96,165,250,0.08)"  },
  database: { icon: Database,  label: "Database", bg: "rgba(167,139,250,0.08)" },
  storage:  { icon: HardDrive, label: "Storage",  bg: "rgba(245,158,11,0.08)"  },
  network:  { icon: Network,   label: "Network",  bg: "rgba(34,197,94,0.08)"   },
};

// ─── Custom node component ───────────────────────────────────────────────────

const NodeContent = ({ data }: any) => {
  const meta  = NODE_META[data.kind] || NODE_META.compute;
  const Icon  = meta.icon;
  const color = data.accentColor || "#94a3b8";
  const isAI  = data.actor?.type === "llm" || data.actor?.type === "agent";

  const containerStyle: React.CSSProperties = data.isGhost ? {
    padding: "12px 14px",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    position: "relative",
    border: `2px dashed ${color}`,
    background: "rgba(74,222,128,0.07)",
    opacity: 0.88,
    minWidth: 148,
  } : {
    padding: "12px 14px",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    position: "relative",
    border: `1.5px solid ${color}40`,
    background: meta.bg,
    minWidth: 148,
    boxShadow: `0 0 0 1px ${color}20, 0 4px 16px rgba(0,0,0,0.3)`,
  };

  return (
    <div style={containerStyle}>
      {/* Provenance badge */}
      <div style={{
        position: "absolute", top: -10, right: -10,
        fontSize: 11, background: "#0f172a", borderRadius: "50%",
        border: `1px solid ${color}60`, width: 22, height: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
      }}>
        {isAI ? <Bot size={12} color={color} /> : <User size={12} color={color} />}
      </div>

      {/* Ghost "AI Proposal" label */}
      {data.isGhost && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4ade80", marginBottom: 2 }}>
          AI Proposal
        </div>
      )}

      {/* Icon + label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `${color}20`, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.2 }}>
          {data.label || "Node"}
        </span>
      </div>

      {/* Kind chip */}
      <div style={{
        display: "inline-flex", alignSelf: "flex-start",
        background: `${color}18`, border: `1px solid ${color}40`,
        borderRadius: 4, padding: "2px 7px",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color,
      }}>
        {meta.label}
      </div>
    </div>
  );
};

const MotorNode    = ({ data }: any) => <NodeContent data={{ ...data, kind: "motor"    }} />;
const GearNode     = ({ data }: any) => <NodeContent data={{ ...data, kind: "gear"     }} />;
const BeamNode     = ({ data }: any) => <NodeContent data={{ ...data, kind: "beam"     }} />;
const SensorNode   = ({ data }: any) => <NodeContent data={{ ...data, kind: "sensor"   }} />;
const ComputeNode  = ({ data }: any) => <NodeContent data={{ ...data, kind: "compute"  }} />;
const DatabaseNode = ({ data }: any) => <NodeContent data={{ ...data, kind: "database" }} />;
const StorageNode  = ({ data }: any) => <NodeContent data={{ ...data, kind: "storage"  }} />;
const NetworkNode  = ({ data }: any) => <NodeContent data={{ ...data, kind: "network"  }} />;

const nodeTypes = {
  motor: MotorNode, gear: GearNode, beam: BeamNode, sensor: SensorNode,
  compute: ComputeNode, database: DatabaseNode, storage: StorageNode, network: NetworkNode,
};

// ─── Audit log helpers ───────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  "node.created":     "#60a5fa",
  "node.updated":     "#a78bfa",
  "edge.created":     "#34d399",
  "proposal.created": "#f59e0b",
  "proposal.resolved":"#4ade80",
};

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return "—"; }
};

const actorLabel = (actor: { type: string; id: string }) => {
  if (actor.type === "human")  return `👤 ${actor.id}`;
  if (actor.type === "llm")    return `🤖 AI Agent`;
  if (actor.type === "system") return `⚙ System`;
  return actor.id;
};

// ─── Main App ────────────────────────────────────────────────────────────────

function App() {
  const { events, addEvent } = useStore();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [domain, setDomain] = useState<"industrial" | "cloud">("cloud");
  const [rawAudit, setRawAudit] = useState(false);
  const [timeIndex, setTimeIndex] = useState(events.length);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // Ephemeral ghost positions — never touch the canonical log
  const ghostPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Auto-advance slider synchronously on new events
  const prevEventsLength = useRef(events.length);
  if (events.length !== prevEventsLength.current) {
    if (timeIndex === prevEventsLength.current) setTimeIndex(events.length);
    prevEventsLength.current = events.length;
  }

  const activeEvents = useMemo(() => events.slice(0, timeIndex), [events, timeIndex]);

  // ── Projection ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const newNodes = new Map<string, FlowNode>();
    const newEdges: FlowEdge[] = [];
    const pendingProposals = new Map<string, ProposalCreatedEvent>();

    activeEvents.forEach(e => {
      if (e.type === "node.created") {
        const p = (e as NodeCreatedEvent).payload;
        if (Object.keys(NODE_META).includes(p.kind)) {
          newNodes.set(p.nodeId, {
            id: p.nodeId, type: p.kind,
            position: { x: p.x, y: p.y },
            data: { label: p.text || p.kind, actor: e.actor, isGhost: false, nodeId: p.nodeId, accentColor: colorFromId(p.nodeId) },
          });
        }
      } else if (e.type === "node.updated") {
        const p = (e as NodeUpdatedEvent).payload;
        const n = newNodes.get(p.nodeId);
        if (n) {
          n.position = { x: p.changes.x ?? n.position.x, y: p.changes.y ?? n.position.y };
          if (p.changes.text) n.data = { ...n.data, label: p.changes.text };
        }
      } else if (e.type === "edge.created") {
        const p = (e as EdgeCreatedEvent).payload;
        newEdges.push({
          id: p.edgeId, source: p.fromNodeId, target: p.toNodeId,
          animated: false, style: { stroke: "#475569", strokeWidth: 2 },
        });
      } else if (e.type === "proposal.created") {
        pendingProposals.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
      } else if (e.type === "proposal.resolved") {
        pendingProposals.delete((e as ProposalResolvedEvent).payload.proposalId);
      }
    });

    // Ghost nodes for pending proposals
    pendingProposals.forEach(proposal => {
      proposal.payload.proposedEvents.forEach(e => {
        if (e.type === "node.created") {
          const p = (e as NodeCreatedEvent).payload;
          if (Object.keys(NODE_META).includes(p.kind)) {
            const pos = ghostPositions.current.get(p.nodeId) ?? { x: p.x, y: p.y };
            newNodes.set(p.nodeId, {
              id: p.nodeId, type: p.kind, position: pos,
              data: { label: p.text || p.kind, actor: proposal.actor, isGhost: true, nodeId: p.nodeId, accentColor: colorFromId(p.nodeId), proposalId: proposal.payload.proposalId },
            });
          }
        } else if (e.type === "edge.created") {
          const p = (e as EdgeCreatedEvent).payload;
          newEdges.push({
            id: p.edgeId + "-ghost", source: p.fromNodeId, target: p.toNodeId,
            animated: true, style: { stroke: "#4ade80", strokeWidth: 2, strokeDasharray: "5,5" },
          });
        }
      });
    });

    setNodes(Array.from(newNodes.values()));
    setEdges(newEdges);
  }, [activeEvents]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onNodesChange = useCallback((c: NodeChange[]) => setNodes(ns => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges(es => applyEdgeChanges(c, es)), []);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: FlowNode) => {
    if (node.data.isGhost) {
      ghostPositions.current.set(node.data.nodeId as string, { x: node.position.x, y: node.position.y });
      return;
    }
    addEvent({
      id: crypto.randomUUID(), boardId: "board_1", branchId: "main",
      type: "node.updated", timestamp: new Date().toISOString(),
      actor: { id: "dev1", type: "human" },
      payload: { nodeId: node.data.nodeId as string, changes: { x: node.position.x, y: node.position.y } },
    } as NodeUpdatedEvent);
  }, [addEvent]);

  const onConnect = useCallback((connection: Connection) => {
    addEvent({
      id: crypto.randomUUID(), boardId: "board_1", branchId: "main",
      type: "edge.created", timestamp: new Date().toISOString(),
      actor: { id: "dev1", type: "human" },
      payload: { edgeId: crypto.randomUUID(), fromNodeId: connection.source!, toNodeId: connection.target! },
    } as EdgeCreatedEvent);
  }, [addEvent]);

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow") as NodeKind;
    if (!type) return;
    addEvent({
      id: crypto.randomUUID(), boardId: "board_1", branchId: "main",
      type: "node.created", timestamp: new Date().toISOString(),
      actor: { id: "dev1", type: "human" },
      payload: { nodeId: crypto.randomUUID(), kind: type, x: e.clientX - 250, y: e.clientY - 50, width: 160, height: 60, text: NODE_META[type]?.label || type },
    } as NodeCreatedEvent);
  }, [addEvent]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // ── Domain switch ────────────────────────────────────────────────────────────
  const switchDomain = (d: "industrial" | "cloud") => {
    setDomain(d);
    setValidationError(null);
    ghostPositions.current.clear();
    const newEvents = d === "cloud" ? buildCloudSeed() : buildIndustrialSeed();
    (framework as any).events = newEvents;
    prevEventsLength.current = newEvents.length;
    setTimeIndex(newEvents.length);
    (framework as any).listeners.forEach((l: any) => l(newEvents));
  };

  // ── Proposals ────────────────────────────────────────────────────────────────
  const pendingProposalsList = useMemo(() => {
    const map = new Map<string, ProposalCreatedEvent>();
    events.forEach(e => {
      if (e.type === "proposal.created") map.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
      if (e.type === "proposal.resolved") map.delete((e as ProposalResolvedEvent).payload.proposalId);
    });
    return Array.from(map.values());
  }, [events]);

  const proposalLogLookup = useMemo(() => {
    const map = new Map<string, ProposalCreatedEvent>();
    events.forEach(e => {
      if (e.type === "proposal.created") map.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
    });
    return map;
  }, [events]);

  const approveProposal = (proposalId: string) => {
    const proposal = proposalLogLookup.get(proposalId);
    if (!proposal) return;
    const adopted = proposal.payload.proposedEvents.map(e => {
      if (e.type === "node.created") {
        const p = (e as NodeCreatedEvent).payload;
        const pos = ghostPositions.current.get(p.nodeId) ?? { x: p.x, y: p.y };
        return { ...e, id: crypto.randomUUID(), timestamp: new Date().toISOString(), payload: { ...p, x: pos.x, y: pos.y } } as NodeCreatedEvent;
      }
      return { ...e, id: crypto.randomUUID(), timestamp: new Date().toISOString() } as EdgeCreatedEvent;
    });
    proposal.payload.proposedEvents.forEach(e => {
      if (e.type === "node.created") ghostPositions.current.delete((e as NodeCreatedEvent).payload.nodeId);
    });
    addEvent({ id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "proposal.resolved", timestamp: new Date().toISOString(), actor: { id: "dev1", type: "human" }, payload: { proposalId, resolution: "approved" } } as ProposalResolvedEvent);
    adopted.forEach(e => addEvent(e));
    setValidationError(null);
  };

  const rejectProposal = (proposalId: string) => {
    const proposal = proposalLogLookup.get(proposalId);
    if (!proposal) return;
    proposal.payload.proposedEvents.forEach(e => {
      if (e.type === "node.created") ghostPositions.current.delete((e as NodeCreatedEvent).payload.nodeId);
    });
    addEvent({ id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "proposal.resolved", timestamp: new Date().toISOString(), actor: { id: "dev1", type: "human" }, payload: { proposalId, resolution: "rejected" } } as ProposalResolvedEvent);
  };

  // ── AI Copilot actions ───────────────────────────────────────────────────────
  const makeDbHighlyAvailable = () => {
    const dbNode = nodes.find(n => !n.data.isGhost && n.type === "database") || nodes.find(n => !n.data.isGhost);
    if (!dbNode) return;
    setValidationError(null);
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      const { x, y } = dbNode.position;
      const replicaId  = crypto.randomUUID();
      const standbyId  = crypto.randomUUID();
      const lbId       = crypto.randomUUID();
      const monitorId  = crypto.randomUUID();
      const proposed: (NodeCreatedEvent | EdgeCreatedEvent)[] = [
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: replicaId, kind: "database", x: x + 220, y,          width: 160, height: 60, text: "DB Read Replica" } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: standbyId, kind: "database", x: x + 220, y: y + 120, width: 160, height: 60, text: "DB Standby"     } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: lbId,      kind: "network",  x: x + 440, y: y + 60,  width: 160, height: 60, text: "DB Load Balancer" } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: monitorId, kind: "compute",  x: x,       y: y + 180, width: 160, height: 60, text: "Health Monitor"   } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: dbNode.id,  toNodeId: replicaId  } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: dbNode.id,  toNodeId: standbyId  } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: replicaId, toNodeId: lbId       } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: standbyId, toNodeId: lbId       } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: monitorId, toNodeId: dbNode.id  } } as EdgeCreatedEvent,
      ];
      addEvent({
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main",
        type: "proposal.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { proposalId: crypto.randomUUID(), title: "Make DB Highly Available", proposedEvents: proposed },
      } as ProposalCreatedEvent);
    }, 1800);
  };

  const makeS3Public = () =>
    setValidationError("Security Violation: Public S3 access violates PCI-DSS compliance policy. Proposal blocked.");

  const addRedundantMotor = () => {
    const motorNode = nodes.find(n => !n.data.isGhost && n.type === "motor") || nodes.find(n => !n.data.isGhost);
    if (!motorNode) return;
    setValidationError(null);
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      const { x, y } = motorNode.position;
      const redMotorId  = crypto.randomUUID();
      const gearId      = crypto.randomUUID();
      const torqueId    = crypto.randomUUID();
      const controlId   = crypto.randomUUID();
      const proposed: (NodeCreatedEvent | EdgeCreatedEvent)[] = [
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: redMotorId, kind: "motor",  x: x,       y: y + 140, width: 160, height: 60, text: "Redundant Motor"  } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: gearId,     kind: "gear",   x: x + 220, y: y + 70,  width: 160, height: 60, text: "Failover Gearbox"  } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: torqueId,   kind: "sensor", x: x + 440, y: y + 70,  width: 160, height: 60, text: "Torque Monitor"    } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: controlId,  kind: "sensor", x: x + 220, y: y + 210, width: 160, height: 60, text: "Switchover Control" } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: motorNode.id, toNodeId: gearId      } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: redMotorId,  toNodeId: gearId      } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: gearId,      toNodeId: torqueId    } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: torqueId,    toNodeId: controlId   } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: controlId,   toNodeId: redMotorId  } } as EdgeCreatedEvent,
      ];
      addEvent({
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main",
        type: "proposal.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { proposalId: crypto.randomUUID(), title: "Add Redundant Motor Drive Chain", proposedEvents: proposed },
      } as ProposalCreatedEvent);
    }, 1800);
  };

  const overclockMotor = () =>
    setValidationError("Safety Violation: Overclock command exceeds rated torque by 340%. Rejected by validation layer.");

  // ── Event type markers for slider ────────────────────────────────────────────
  const sliderMarkers = useMemo(() => events.map((e, i) => ({
    index: i + 1,
    color: EVENT_COLORS[e.type] || "#64748b",
    isProposal: e.type === "proposal.created",
    isApproval: e.type === "proposal.resolved",
  })), [events]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#060d1a", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── Top Header ── */}
      <div style={{ background: "rgba(15,23,42,0.95)", borderBottom: "1px solid #1e293b", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, flexShrink: 0, backdropFilter: "blur(12px)" }}>
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GitBranch size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#f8fafc", letterSpacing: "-0.01em" }}>Replayabl</span>
          <span style={{ fontSize: 11, color: "#475569", fontWeight: 500, marginLeft: 4 }}>/ Infra-Graph</span>
        </div>

        {/* Domain tabs */}
        <div style={{ display: "flex", gap: 4, background: "#0f172a", borderRadius: 8, padding: 4, border: "1px solid #1e293b" }}>
          {(["cloud", "industrial"] as const).map(d => (
            <button key={d} onClick={() => switchDomain(d)} style={{
              padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              background: domain === d ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "transparent",
              color: domain === d ? "white" : "#64748b",
            }}>
              {d === "cloud" ? "☁ Cloud Infra" : "⚙ Industrial"}
            </button>
          ))}
        </div>

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          Event stream live · {events.length} events
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 200, background: "rgba(15,23,42,0.8)", borderRight: "1px solid #1e293b", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>Components</div>
          {(domain === "cloud"
            ? [["compute","Server","☁"],["database","Database","🗄"],["storage","Storage","💾"],["network","Network","🔗"]]
            : [["motor","Motor","⚡"],["gear","Gear","⚙"],["beam","Beam","▬"],["sensor","Sensor","📡"]]
          ).map(([type, label, icon]) => (
            <div key={type} draggable onDragStart={e => onDragStart(e, type)}
              style={{ padding: "9px 12px", border: "1px solid #1e293b", background: "#0f172a", borderRadius: 8, cursor: "grab", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#cbd5e1", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#334155")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e293b")}
            >
              <span style={{ fontSize: 14 }}>{icon}</span> {label}
            </div>
          ))}
        </div>

        {/* ── Main Canvas ── */}
        <div style={{ flex: 1, position: "relative", background: "#060d1a" }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop} onConnect={onConnect}
              nodeTypes={nodeTypes} fitView colorMode="dark"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1e293b" gap={24} size={1} />
              <Controls style={{ background: "#0f172a", border: "1px solid #1e293b" }} />
            </ReactFlow>
          </ReactFlowProvider>

          {/* AI thinking overlay */}
          {aiThinking && (
            <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.92)", border: "1px solid #334155", borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94a3b8", backdropFilter: "blur(12px)", zIndex: 100 }}>
              <Bot size={16} color="#a78bfa" />
              <span style={{ color: "#a78bfa", fontWeight: 600 }}>AI Agent</span>
              <span>analyzing topology</span>
              <ThinkingDots />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div style={{ width: 300, background: "rgba(15,23,42,0.9)", borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 0, flexShrink: 0, overflow: "hidden" }}>

          {/* Audit Log */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderBottom: "1px solid #1e293b" }}>
            <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569" }}>Audit Log</span>
              <button onClick={() => setRawAudit(!rawAudit)} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", borderRadius: 4, padding: "2px 7px", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                {rawAudit ? <List size={10} /> : <Code size={10} />}
                {rawAudit ? "UI" : "JSON"}
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0 10px 10px" }}>
              {rawAudit ? (
                <pre style={{ fontSize: 10, color: "#475569", margin: 0, lineHeight: 1.6 }}>
                  {JSON.stringify(activeEvents, null, 2)}
                </pre>
              ) : (
                [...activeEvents].reverse().slice(0, 25).map(e => {
                  const color = EVENT_COLORS[e.type] || "#64748b";
                  return (
                    <div key={e.id} style={{ padding: "7px 8px", borderRadius: 6, marginBottom: 4, background: "#0a1628", border: `1px solid ${color}20` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "monospace" }}>{e.type}</span>
                        <span style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>{fmtTime(e.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{actorLabel(e.actor as any)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Copilot */}
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bot size={13} color="#a78bfa" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569" }}>AI Copilot</span>
            </div>

            {validationError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #7f1d1d", color: "#fca5a5", padding: "8px 10px", borderRadius: 7, fontSize: 11, display: "flex", gap: 7, lineHeight: 1.5 }}>
                <Shield size={13} style={{ flexShrink: 0, marginTop: 1 }} color="#ef4444" />
                <span>{validationError}</span>
              </div>
            )}

            {domain === "cloud" ? (
              <>
                <CopilotButton icon={<Zap size={13} />} label="Make DB Highly Available" color="#3b82f6" onClick={makeDbHighlyAvailable} disabled={aiThinking} />
                <CopilotButton icon={<XCircle size={13} />} label="Make S3 Public" color="#ef4444" onClick={makeS3Public} disabled={aiThinking} />
              </>
            ) : (
              <>
                <CopilotButton icon={<Zap size={13} />} label="Add Redundant Drive Chain" color="#3b82f6" onClick={addRedundantMotor} disabled={aiThinking} />
                <CopilotButton icon={<XCircle size={13} />} label="Overclock Motor" color="#ef4444" onClick={overclockMotor} disabled={aiThinking} />
              </>
            )}

            {/* Pending proposals */}
            {pendingProposalsList.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", marginBottom: 8 }}>Pending Proposals</div>
                {pendingProposalsList.map(p => (
                  <div key={p.payload.proposalId} style={{ background: "rgba(74,222,128,0.04)", border: "1px solid #14532d", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Bot size={12} color="#4ade80" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>{p.payload.title}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>
                      {p.payload.proposedEvents.length} events · {p.payload.proposedEvents.filter(e => e.type === "node.created").length} nodes · {p.payload.proposedEvents.filter(e => e.type === "edge.created").length} edges
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approveProposal(p.payload.proposalId)} style={{ flex: 1, padding: "6px 0", background: "#15803d", color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <CheckCircle size={11} /> Approve
                      </button>
                      <button onClick={() => rejectProposal(p.payload.proposalId)} style={{ flex: 1, padding: "6px 0", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <XCircle size={11} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Time Travel Bar ── */}
      <div style={{ background: "#020617", borderTop: "1px solid #0f172a", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <PlaySquare size={18} color="#3b82f6" />
        <div style={{ flex: 1, position: "relative" }}>
          {/* Event type markers */}
          <div style={{ position: "absolute", top: -8, left: 0, right: 0, height: 6, pointerEvents: "none" }}>
            {events.length > 0 && sliderMarkers.map(m => (
              <div key={m.index} style={{
                position: "absolute",
                left: `${((m.index - 0.5) / events.length) * 100}%`,
                width: m.isProposal || m.isApproval ? 8 : 4,
                height: m.isProposal || m.isApproval ? 8 : 4,
                borderRadius: "50%",
                background: m.color,
                transform: "translate(-50%, -50%)",
                top: "50%",
                opacity: 0.8,
              }} />
            ))}
          </div>
          <input
            type="range" min="0" max={events.length} value={timeIndex}
            onChange={e => setTimeIndex(parseInt(e.target.value))}
            style={{ width: "100%", cursor: "pointer", accentColor: "#3b82f6", height: 4 }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", whiteSpace: "nowrap" }}>
          {timeIndex < events.length
            ? <span style={{ color: "#f59e0b" }}>◀ Time Travel · Event {timeIndex} / {events.length}</span>
            : <span>Event {timeIndex} / {events.length}</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Small helper components ─────────────────────────────────────────────────

function ThinkingDots() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 350);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: "monospace", color: "#a78bfa", letterSpacing: 2 }}>{"...".slice(0, frame)}&nbsp;</span>;
}

function CopilotButton({ icon, label, color, onClick, disabled }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
      width: "100%", padding: "8px 0", background: disabled ? "#0f172a" : `${color}18`,
      color: disabled ? "#334155" : color,
      border: `1px solid ${disabled ? "#1e293b" : color + "50"}`,
      borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 12, fontWeight: 600, transition: "all 0.15s",
    }}>
      {icon} {label}
    </button>
  );
}

// ─── Mount ───────────────────────────────────────────────────────────────────

const rootEl = document.getElementById("app");
if (rootEl) createRoot(rootEl).render(<App />);
