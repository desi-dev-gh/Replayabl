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
  CheckCircle, XCircle, Server,
  Database, HardDrive, Network, Code, List,
  Zap, Bot, User, GitBranch, Shield, Sun, Moon,
} from "lucide-react";
import { create } from "zustand";

import "./styles.css";
import { Framework } from "../core/framework";
import {
  WhiteboardEvent, NodeKind, EdgeCreatedEvent,
  NodeCreatedEvent, ProposalCreatedEvent,
  ProposalResolvedEvent, NodeUpdatedEvent,
} from "../core/events";

// ─── Theme tokens ────────────────────────────────────────────────────────────

type Theme = "dark" | "light";

const THEMES = {
  dark: {
    appBg:         "#060d1a",
    headerBg:      "rgba(15,23,42,0.95)",
    headerBorder:  "#1e293b",
    headerText:    "#f8fafc",
    headerSub:     "#475569",
    tabBg:         "#0f172a",
    tabBorder:     "#1e293b",
    tabInactive:   "#64748b",
    sidebarBg:     "rgba(15,23,42,0.8)",
    sidebarBorder: "#1e293b",
    sidebarLabel:  "#475569",
    sidebarItem:   "#0f172a",
    sidebarItemBorder: "#1e293b",
    sidebarItemHover:  "#334155",
    sidebarText:   "#cbd5e1",
    canvasBg:      "#060d1a",
    bgDot:         "#1e293b",
    controlsBg:    "#0f172a",
    controlsBorder:"#1e293b",
    rightBg:       "rgba(15,23,42,0.9)",
    rightBorder:   "#1e293b",
    auditLabel:    "#475569",
    auditBtnBorder:"#1e293b",
    auditBtnColor: "#64748b",
    auditRow:      "#0a1628",
    auditTimestamp:"#334155",
    auditActor:    "#475569",
    rawPre:        "#475569",
    copilotLabel:  "#475569",
    proposalCard:  "rgba(74,222,128,0.04)",
    proposalBorder:"#14532d",
    proposalTitle: "#4ade80",
    proposalMeta:  "#475569",
    approveBg:     "#15803d",
    approveColor:  "white",
    rejectBg:      "#7f1d1d",
    rejectColor:   "#fca5a5",
    timeBg:        "#020617",
    timeBorder:    "#0f172a",
    timeText:      "#334155",
    statusText:    "#64748b",
    nodeBadgeBg:   "#0f172a",
    nodeText:      "#f1f5f9",
    edgeStroke:    "#475569",
    colorMode:     "dark" as const,
  },
  light: {
    appBg:         "#f1f5f9",
    headerBg:      "rgba(255,255,255,0.95)",
    headerBorder:  "#e2e8f0",
    headerText:    "#0f172a",
    headerSub:     "#94a3b8",
    tabBg:         "#f8fafc",
    tabBorder:     "#e2e8f0",
    tabInactive:   "#94a3b8",
    sidebarBg:     "rgba(248,250,252,0.95)",
    sidebarBorder: "#e2e8f0",
    sidebarLabel:  "#94a3b8",
    sidebarItem:   "#ffffff",
    sidebarItemBorder: "#e2e8f0",
    sidebarItemHover:  "#cbd5e1",
    sidebarText:   "#334155",
    canvasBg:      "#f8fafc",
    bgDot:         "#e2e8f0",
    controlsBg:    "#ffffff",
    controlsBorder:"#e2e8f0",
    rightBg:       "rgba(255,255,255,0.95)",
    rightBorder:   "#e2e8f0",
    auditLabel:    "#94a3b8",
    auditBtnBorder:"#e2e8f0",
    auditBtnColor: "#94a3b8",
    auditRow:      "#f8fafc",
    auditTimestamp:"#cbd5e1",
    auditActor:    "#94a3b8",
    rawPre:        "#64748b",
    copilotLabel:  "#94a3b8",
    proposalCard:  "rgba(22,163,74,0.06)",
    proposalBorder:"#86efac",
    proposalTitle: "#16a34a",
    proposalMeta:  "#94a3b8",
    approveBg:     "#16a34a",
    approveColor:  "white",
    rejectBg:      "#fee2e2",
    rejectColor:   "#dc2626",
    timeBg:        "#ffffff",
    timeBorder:    "#e2e8f0",
    timeText:      "#94a3b8",
    statusText:    "#94a3b8",
    nodeBadgeBg:   "#ffffff",
    nodeText:      "#0f172a",
    edgeStroke:    "#94a3b8",
    colorMode:     "light" as const,
  },
};

// ─── Framework bootstrap ────────────────────────────────────────────────────

const buildCloudSeed = (): WhiteboardEvent[] => {
  const t = (s: number) => new Date(Date.now() - (10 - s) * 4000).toISOString();
  const human = { id: "dev1", type: "human" as const };
  const sys   = { id: "system", type: "system" as const };

  const webId   = "node_web";
  const apiId   = "node_api";
  const dbId    = "node_db";
  const cacheId = "node_cache";
  const cdnId   = "node_cdn";

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

  const motorId   = "node_motor";
  const gearboxId = "node_gearbox";
  const shaftId   = "node_shaft";
  const sensorId  = "node_sensor";
  const controlId = "node_control";

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

const NODE_META: Record<string, { icon: React.ElementType; label: string }> = {
  motor:    { icon: Cpu,       label: "Motor"    },
  gear:     { icon: Settings,  label: "Gear"     },
  beam:     { icon: Square,    label: "Beam"     },
  sensor:   { icon: Activity,  label: "Sensor"   },
  compute:  { icon: Server,    label: "Compute"  },
  database: { icon: Database,  label: "Database" },
  storage:  { icon: HardDrive, label: "Storage"  },
  network:  { icon: Network,   label: "Network"  },
};

// ─── Custom node component ───────────────────────────────────────────────────

const NodeContent = ({ data }: any) => {
  const meta  = NODE_META[data.kind] || NODE_META.compute;
  const Icon  = meta.icon;
  const color = data.accentColor || "#94a3b8";
  const isAI  = data.actor?.type === "llm" || data.actor?.type === "agent";
  const isDark = data.theme !== "light";

  const nodeBg   = isDark ? "rgba(15,23,42,0.85)"  : "#ffffff";
  const nodeText = isDark ? "#f1f5f9"               : "#0f172a";
  const badgeBg  = isDark ? "#0f172a"               : "#ffffff";

  const containerStyle: React.CSSProperties = data.isGhost ? {
    padding: "12px 14px", borderRadius: 10,
    display: "flex", flexDirection: "column", gap: 6, position: "relative",
    border: `2px dashed ${color}`,
    background: isDark ? "rgba(74,222,128,0.07)" : "rgba(22,163,74,0.06)",
    opacity: 0.9, minWidth: 148,
  } : {
    padding: "12px 14px", borderRadius: 10,
    display: "flex", flexDirection: "column", gap: 6, position: "relative",
    border: `1.5px solid ${color}40`,
    background: nodeBg,
    minWidth: 148,
    boxShadow: isDark
      ? `0 0 0 1px ${color}20, 0 4px 16px rgba(0,0,0,0.3)`
      : `0 0 0 1px ${color}20, 0 2px 8px rgba(0,0,0,0.08)`,
  };

  return (
    <div style={containerStyle}>
      {/* Provenance badge */}
      <div style={{
        position: "absolute", top: -10, right: -10,
        background: badgeBg, borderRadius: "50%",
        border: `1px solid ${color}60`, width: 22, height: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      }}>
        {isAI ? <Bot size={12} color={color} /> : <User size={12} color={color} />}
      </div>

      {/* Ghost label */}
      {data.isGhost && (
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isDark ? "#4ade80" : "#16a34a", marginBottom: 2 }}>
          AI Proposal
        </div>
      )}

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: nodeText, lineHeight: 1.2 }}>
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
  "node.created":      "#60a5fa",
  "node.updated":      "#a78bfa",
  "edge.created":      "#34d399",
  "proposal.created":  "#f59e0b",
  "proposal.resolved": "#4ade80",
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
  const [theme, setTheme] = useState<Theme>("dark");

  const T = THEMES[theme];

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
            data: { label: p.text || p.kind, actor: e.actor, isGhost: false, nodeId: p.nodeId, accentColor: colorFromId(p.nodeId), theme },
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
          animated: false, style: { stroke: T.edgeStroke, strokeWidth: 2 },
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
              data: { label: p.text || p.kind, actor: proposal.actor, isGhost: true, nodeId: p.nodeId, accentColor: colorFromId(p.nodeId), proposalId: proposal.payload.proposalId, theme },
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
  }, [activeEvents, theme]);

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
      const replicaId = crypto.randomUUID();
      const standbyId = crypto.randomUUID();
      const lbId      = crypto.randomUUID();
      const monitorId = crypto.randomUUID();
      const proposed: (NodeCreatedEvent | EdgeCreatedEvent)[] = [
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: replicaId, kind: "database", x: x + 220, y,          width: 160, height: 60, text: "DB Read Replica"  } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: standbyId, kind: "database", x: x + 220, y: y + 120, width: 160, height: 60, text: "DB Standby"       } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: lbId,      kind: "network",  x: x + 440, y: y + 60,  width: 160, height: 60, text: "DB Load Balancer" } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: monitorId, kind: "compute",  x: x,       y: y + 180, width: 160, height: 60, text: "Health Monitor"   } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: dbNode.id,  toNodeId: replicaId } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: dbNode.id,  toNodeId: standbyId } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: replicaId, toNodeId: lbId      } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: standbyId, toNodeId: lbId      } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: monitorId, toNodeId: dbNode.id } } as EdgeCreatedEvent,
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
      const redMotorId = crypto.randomUUID();
      const gearId     = crypto.randomUUID();
      const torqueId   = crypto.randomUUID();
      const controlId  = crypto.randomUUID();
      const proposed: (NodeCreatedEvent | EdgeCreatedEvent)[] = [
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: redMotorId, kind: "motor",  x: x,       y: y + 140, width: 160, height: 60, text: "Redundant Motor"   } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: gearId,     kind: "gear",   x: x + 220, y: y + 70,  width: 160, height: 60, text: "Failover Gearbox"  } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: torqueId,   kind: "sensor", x: x + 440, y: y + 70,  width: 160, height: 60, text: "Torque Monitor"    } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { nodeId: controlId,  kind: "sensor", x: x + 220, y: y + 210, width: 160, height: 60, text: "Switchover Control" } } as NodeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: motorNode.id, toNodeId: gearId     } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: redMotorId,  toNodeId: gearId     } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: gearId,      toNodeId: torqueId   } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: torqueId,    toNodeId: controlId  } } as EdgeCreatedEvent,
        { id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(), actor: { id: "agent1", type: "llm" }, payload: { edgeId: crypto.randomUUID(), fromNodeId: controlId,   toNodeId: redMotorId } } as EdgeCreatedEvent,
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: T.appBg, color: T.headerText, fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden", transition: "background 0.2s, color 0.2s" }}>

      {/* ── Top Header ── */}
      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}`, padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, flexShrink: 0, backdropFilter: "blur(12px)" }}>
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GitBranch size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.headerText, letterSpacing: "-0.01em" }}>Replayabl</span>
          <span style={{ fontSize: 11, color: T.headerSub, fontWeight: 500, marginLeft: 4 }}>/ Infra-Graph</span>
        </div>

        {/* Domain tabs */}
        <div style={{ display: "flex", gap: 4, background: T.tabBg, borderRadius: 8, padding: 4, border: `1px solid ${T.tabBorder}` }}>
          {(["cloud", "industrial"] as const).map(d => (
            <button key={d} onClick={() => switchDomain(d)} style={{
              padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              background: domain === d ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "transparent",
              color: domain === d ? "white" : T.tabInactive,
            }}>
              {d === "cloud" ? "☁ Cloud Infra" : "⚙ Industrial"}
            </button>
          ))}
        </div>

        {/* Right side: status + theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.statusText }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            Event stream live · {events.length} events
          </div>
          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.tabBorder}`,
            background: T.tabBg, cursor: "pointer", color: T.tabInactive,
            transition: "all 0.15s",
          }}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 200, background: T.sidebarBg, borderRight: `1px solid ${T.sidebarBorder}`, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.sidebarLabel, marginBottom: 6 }}>Components</div>
          {(domain === "cloud"
            ? [["compute","Server","☁"],["database","Database","🗄"],["storage","Storage","💾"],["network","Network","🔗"]]
            : [["motor","Motor","⚡"],["gear","Gear","⚙"],["beam","Beam","▬"],["sensor","Sensor","📡"]]
          ).map(([type, label, icon]) => (
            <div key={type} draggable onDragStart={e => onDragStart(e, type)}
              style={{ padding: "9px 12px", border: `1px solid ${T.sidebarItemBorder}`, background: T.sidebarItem, borderRadius: 8, cursor: "grab", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.sidebarText, transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = T.sidebarItemHover)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = T.sidebarItemBorder)}
            >
              <span style={{ fontSize: 14 }}>{icon}</span> {label}
            </div>
          ))}
        </div>

        {/* ── Main Canvas ── */}
        <div style={{ flex: 1, position: "relative", background: T.canvasBg }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop} onConnect={onConnect}
              nodeTypes={nodeTypes} fitView colorMode={T.colorMode}
              proOptions={{ hideAttribution: true }}
            >
              <Background color={T.bgDot} gap={24} size={1} />
              <Controls style={{ background: T.controlsBg, border: `1px solid ${T.controlsBorder}` }} />
            </ReactFlow>
          </ReactFlowProvider>

          {/* AI thinking overlay */}
          {aiThinking && (
            <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", background: theme === "dark" ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.92)", border: `1px solid ${T.headerBorder}`, borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.auditActor, backdropFilter: "blur(12px)", zIndex: 100 }}>
              <Bot size={16} color="#a78bfa" />
              <span style={{ color: "#a78bfa", fontWeight: 600 }}>AI Agent</span>
              <span>analyzing topology</span>
              <ThinkingDots />
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div style={{ width: 300, background: T.rightBg, borderLeft: `1px solid ${T.rightBorder}`, display: "flex", flexDirection: "column", gap: 0, flexShrink: 0, overflow: "hidden" }}>

          {/* Audit Log */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderBottom: `1px solid ${T.rightBorder}` }}>
            <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.auditLabel }}>Audit Log</span>
              <button onClick={() => setRawAudit(!rawAudit)} style={{ background: "transparent", border: `1px solid ${T.auditBtnBorder}`, color: T.auditBtnColor, borderRadius: 4, padding: "2px 7px", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                {rawAudit ? <List size={10} /> : <Code size={10} />}
                {rawAudit ? "UI" : "JSON"}
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0 10px 10px" }}>
              {rawAudit ? (
                <pre style={{ fontSize: 10, color: T.rawPre, margin: 0, lineHeight: 1.6 }}>
                  {JSON.stringify(activeEvents, null, 2)}
                </pre>
              ) : (
                [...activeEvents].reverse().slice(0, 25).map(e => {
                  const color = EVENT_COLORS[e.type] || "#64748b";
                  return (
                    <div key={e.id} style={{ padding: "7px 8px", borderRadius: 6, marginBottom: 4, background: T.auditRow, border: `1px solid ${color}20` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "monospace" }}>{e.type}</span>
                        <span style={{ fontSize: 9, color: T.auditTimestamp, fontFamily: "monospace" }}>{fmtTime(e.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: T.auditActor }}>{actorLabel(e.actor as any)}</div>
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
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.copilotLabel }}>AI Copilot</span>
            </div>

            {validationError && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: theme === "dark" ? "#fca5a5" : "#dc2626", padding: "8px 10px", borderRadius: 7, fontSize: 11, display: "flex", gap: 7, lineHeight: 1.5 }}>
                <Shield size={13} style={{ flexShrink: 0, marginTop: 1 }} color="#ef4444" />
                <span>{validationError}</span>
              </div>
            )}

            {domain === "cloud" ? (
              <>
                <CopilotButton icon={<Zap size={13} />} label="Make DB Highly Available" color="#3b82f6" onClick={makeDbHighlyAvailable} disabled={aiThinking} theme={theme} />
                <CopilotButton icon={<XCircle size={13} />} label="Make S3 Public" color="#ef4444" onClick={makeS3Public} disabled={aiThinking} theme={theme} />
              </>
            ) : (
              <>
                <CopilotButton icon={<Zap size={13} />} label="Add Redundant Drive Chain" color="#3b82f6" onClick={addRedundantMotor} disabled={aiThinking} theme={theme} />
                <CopilotButton icon={<XCircle size={13} />} label="Overclock Motor" color="#ef4444" onClick={overclockMotor} disabled={aiThinking} theme={theme} />
              </>
            )}

            {/* Pending proposals */}
            {pendingProposalsList.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.copilotLabel, marginBottom: 8 }}>Pending Proposals</div>
                {pendingProposalsList.map(p => (
                  <div key={p.payload.proposalId} style={{ background: T.proposalCard, border: `1px solid ${T.proposalBorder}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Bot size={12} color={T.proposalTitle} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.proposalTitle }}>{p.payload.title}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.proposalMeta, marginBottom: 8 }}>
                      {p.payload.proposedEvents.length} events · {p.payload.proposedEvents.filter(e => e.type === "node.created").length} nodes · {p.payload.proposedEvents.filter(e => e.type === "edge.created").length} edges
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approveProposal(p.payload.proposalId)} style={{ flex: 1, padding: "6px 0", background: T.approveBg, color: T.approveColor, border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <CheckCircle size={11} /> Approve
                      </button>
                      <button onClick={() => rejectProposal(p.payload.proposalId)} style={{ flex: 1, padding: "6px 0", background: T.rejectBg, color: T.rejectColor, border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
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
      <div style={{ background: T.timeBg, borderTop: `1px solid ${T.timeBorder}`, padding: "10px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
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
        <div style={{ fontSize: 11, color: T.timeText, fontFamily: "monospace", whiteSpace: "nowrap" }}>
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

function CopilotButton({ icon, label, color, onClick, disabled, theme }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled?: boolean; theme: Theme }) {
  const disabledBg    = theme === "dark" ? "#0f172a" : "#f1f5f9";
  const disabledColor = theme === "dark" ? "#334155" : "#cbd5e1";
  const disabledBorder= theme === "dark" ? "#1e293b" : "#e2e8f0";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
      width: "100%", padding: "8px 0",
      background: disabled ? disabledBg : `${color}18`,
      color: disabled ? disabledColor : color,
      border: `1px solid ${disabled ? disabledBorder : color + "50"}`,
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
