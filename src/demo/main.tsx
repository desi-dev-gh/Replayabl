import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlow, Background, Controls, Node as FlowNode, Edge as FlowEdge, applyNodeChanges, applyEdgeChanges, Connection, ReactFlowProvider, NodeChange, EdgeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Cpu, Settings, Square, Activity, PlaySquare, AlertTriangle, CheckCircle, XCircle, Server, Database, HardDrive, Network, Code, List } from "lucide-react";
import { create } from "zustand";

import "./styles.css";
import { Framework } from "../core/framework";
import { WhiteboardEvent, NodeKind, EdgeCreatedEvent, NodeCreatedEvent, ProposalCreatedEvent, ProposalResolvedEvent, NodeUpdatedEvent } from "../core/events";
import { seedWhiteboardEvents } from "../examples/demo-events";

// Ensure framework has the class if it wasn't added yet
if (typeof (Framework as any) === "undefined") {
  // Polyfill it if missing
  (window as any).Framework = class MockFramework {
    events: WhiteboardEvent[] = [];
    state: any = null;
    listeners = new Set<any>();
    
    constructor(initialEvents: WhiteboardEvent[] = []) {
      this.events = initialEvents;
    }
    getEvents() { return this.events; }
    appendEvent(e: WhiteboardEvent) {
      this.events.push(e);
      this.listeners.forEach(l => l(this.events));
    }
    subscribe(listener: any) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
  };
}

const framework = new (Framework || (window as any).Framework)(seedWhiteboardEvents);

type StoreState = {
  events: WhiteboardEvent[];
  addEvent: (e: WhiteboardEvent) => void;
};

const useStore = create<StoreState>((set) => {
  framework.subscribe((s: any, events: WhiteboardEvent[]) => {
    set({ events: [...(events || framework.getEvents())] });
  });
  return {
    events: framework.getEvents(),
    addEvent: (e: WhiteboardEvent) => {
      framework.appendEvent(e);
    }
  };
});

const NodeContent = ({ data, icon: Icon }: any) => {
  const isAI = data.actor?.type === 'llm' || data.actor?.type === 'agent' || data.actor?.type === 'system';
  const badge = isAI ? '🤖' : '🧑';
  const accentColor = data.accentColor || '#94a3b8';
  
  const ghostStyles = data.isGhost ? {
    border: `2px dashed ${accentColor}`,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    opacity: 0.8,
  } : {
    border: `1px solid ${accentColor}`,
    backgroundColor: '#1e293b',
    color: '#f8fafc'
  };

  return (
    <div style={{ padding: 10, borderRadius: 5, display: 'flex', gap: 5, alignItems: 'center', position: 'relative', flexDirection: 'column', ...ghostStyles }}>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', width: '100%' }}>
        <Icon size={16} color={accentColor} /> 
        <span style={{fontSize: 12, fontWeight: 500}}>{data.label || 'Node'}</span>
      </div>
      <div style={{ fontSize: '9px', color: accentColor, fontFamily: 'monospace', width: '100%', textAlign: 'left', marginTop: 2, opacity: 0.85 }}>
        ID: {data.nodeId?.substring(0, 8)}
      </div>
      <div style={{ fontSize: '9px', color: accentColor, fontFamily: 'monospace', width: '100%', textAlign: 'left', opacity: 0.85 }}>
        COLOR: {accentColor}
      </div>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 14, background: '#0f172a', borderRadius: '50%', padding: '2px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
        {badge}
      </div>
    </div>
  );
};

const MotorNode = ({ data }: any) => <NodeContent data={data} icon={Cpu} />;
const GearNode = ({ data }: any) => <NodeContent data={data} icon={Settings} />;
const BeamNode = ({ data }: any) => <NodeContent data={data} icon={Square} />;
const SensorNode = ({ data }: any) => <NodeContent data={data} icon={Activity} />;
const ComputeNode = ({ data }: any) => <NodeContent data={data} icon={Server} />;
const DatabaseNode = ({ data }: any) => <NodeContent data={data} icon={Database} />;
const StorageNode = ({ data }: any) => <NodeContent data={data} icon={HardDrive} />;
const NetworkNode = ({ data }: any) => <NodeContent data={data} icon={Network} />;

const nodeTypes = {
  motor: MotorNode,
  gear: GearNode,
  beam: BeamNode,
  sensor: SensorNode,
  compute: ComputeNode,
  database: DatabaseNode,
  storage: StorageNode,
  network: NetworkNode,
};

const NODE_COLORS = ["#38bdf8", "#a78bfa", "#fb7185", "#34d399", "#f59e0b", "#f97316", "#22c55e", "#60a5fa"];

const colorFromId = (id: string) => {
  const index = Array.from(id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % NODE_COLORS.length;
  return NODE_COLORS[index];
};

function App() {
  const { events, addEvent } = useStore();
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [domain, setDomain] = useState<'industrial' | 'cloud'>('industrial');
  const [rawAudit, setRawAudit] = useState(false);
  
  const [timeIndex, setTimeIndex] = useState(events.length);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Ephemeral map for ghost node positions — NOT committed to the canonical log
  const ghostPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Instantly auto-advance time slider when new events are added at the end
  const prevEventsLength = useRef(events.length);
  if (events.length !== prevEventsLength.current) {
    if (timeIndex === prevEventsLength.current) {
      setTimeIndex(events.length);
    }
    prevEventsLength.current = events.length;
  }

  const activeEvents = useMemo(() => events.slice(0, timeIndex), [events, timeIndex]);

  useEffect(() => {
    const newNodes = new Map<string, FlowNode>();
    const newEdges: FlowEdge[] = [];
    const pendingProposals = new Map<string, ProposalCreatedEvent>();

    // Process active events — committed nodes only
    activeEvents.forEach(e => {
      if (e.type === 'node.created') {
        const payload = (e as NodeCreatedEvent).payload;
        if (['motor', 'gear', 'beam', 'sensor', 'compute', 'database', 'storage', 'network'].includes(payload.kind)) {
          newNodes.set(payload.nodeId, {
            id: payload.nodeId,
            type: payload.kind,
            position: { x: payload.x, y: payload.y },
            data: { label: payload.text || payload.kind, actor: e.actor, isGhost: false, nodeId: payload.nodeId, accentColor: colorFromId(payload.nodeId) }
          });
        }
      } else if (e.type === 'node.updated') {
        const payload = (e as NodeUpdatedEvent).payload;
        const node = newNodes.get(payload.nodeId);
        if (node) {
          node.position = {
            x: payload.changes.x ?? node.position.x,
            y: payload.changes.y ?? node.position.y
          };
          if (payload.changes.text) {
            node.data = { ...node.data, label: payload.changes.text };
          }
        }
      } else if (e.type === 'edge.created') {
        const payload = (e as EdgeCreatedEvent).payload;
        newEdges.push({
          id: payload.edgeId,
          source: payload.fromNodeId,
          target: payload.toNodeId,
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        });
      } else if (e.type === 'proposal.created') {
        pendingProposals.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
      } else if (e.type === 'proposal.resolved') {
        const payload = (e as ProposalResolvedEvent).payload;
        pendingProposals.delete(payload.proposalId);
      }
    });

    // Process pending proposals — ghost nodes use ephemeral ghostPositions for display
    pendingProposals.forEach(proposal => {
      proposal.payload.proposedEvents.forEach(e => {
        if (e.type === 'node.created') {
          const payload = (e as NodeCreatedEvent).payload;
          if (['motor', 'gear', 'beam', 'sensor', 'compute', 'database', 'storage', 'network'].includes(payload.kind)) {
            const ephemeralPos = ghostPositions.current.get(payload.nodeId);
            newNodes.set(payload.nodeId, {
              id: payload.nodeId,
              type: payload.kind,
              position: ephemeralPos ?? { x: payload.x, y: payload.y },
              data: { label: payload.text || payload.kind, actor: proposal.actor, isGhost: true, nodeId: payload.nodeId, accentColor: colorFromId(payload.nodeId), proposalId: proposal.payload.proposalId }
            });
          }
        } else if (e.type === 'edge.created') {
          const payload = (e as EdgeCreatedEvent).payload;
          newEdges.push({
            id: payload.edgeId + '-ghost',
            source: payload.fromNodeId,
            target: payload.toNodeId,
            animated: true,
            style: { stroke: '#4ade80', strokeWidth: 2, strokeDasharray: '5,5' }
          });
        }
      });
    });

    setNodes(Array.from(newNodes.values()));
    setEdges(newEdges);
  }, [activeEvents]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes(ns => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges(es => applyEdgeChanges(changes, es)), []);
  
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: FlowNode) => {
    if (node.data.isGhost) {
      // Ghost nodes: track position ephemerally — do NOT commit to canonical log
      ghostPositions.current.set(node.data.nodeId as string, { x: node.position.x, y: node.position.y });
      return;
    }
    // Committed nodes: record drag as canonical event
    const updateEvent: NodeUpdatedEvent = {
      id: crypto.randomUUID(),
      boardId: "board_1",
      branchId: "main",
      type: "node.updated",
      timestamp: new Date().toISOString(),
      actor: { id: "user1", type: "human" },
      payload: {
        nodeId: node.data.nodeId as string,
        changes: {
          x: node.position.x,
          y: node.position.y,
          metadata: { source: "human-drag" }
        }
      }
    };
    addEvent(updateEvent);
  }, [addEvent]);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: EdgeCreatedEvent = {
      id: crypto.randomUUID(),
      boardId: "board_1",
      branchId: "main",
      type: "edge.created",
      timestamp: new Date().toISOString(),
      actor: { id: "user1", type: "human" },
      payload: {
        edgeId: crypto.randomUUID(),
        fromNodeId: connection.source!,
        toNodeId: connection.target!,
      }
    };
    addEvent(newEdge);
  }, [addEvent]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeKind;
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 50,
      };

      const newNode: NodeCreatedEvent = {
        id: crypto.randomUUID(),
        boardId: "board_1",
        branchId: "main",
        type: "node.created",
        timestamp: new Date().toISOString(),
        actor: { id: "user1", type: "human" },
        payload: {
          nodeId: crypto.randomUUID(),
          kind: type,
          x: position.x,
          y: position.y,
          width: 150,
          height: 50,
          text: type.charAt(0).toUpperCase() + type.slice(1)
        }
      };
      addEvent(newNode);
    },
    [addEvent]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const switchDomain = (newDomain: 'industrial' | 'cloud') => {
    setDomain(newDomain);
    ghostPositions.current.clear();
    (framework as any).events = [];
    
    const newEvents: WhiteboardEvent[] = [];
    if (newDomain === 'cloud') {
      newEvents.push({
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created",
        timestamp: new Date().toISOString(), actor: { id: "system", type: "system" },
        payload: { nodeId: crypto.randomUUID(), kind: 'compute', x: 250, y: 150, width: 150, height: 50, text: 'Web Server' }
      } as NodeCreatedEvent);
    } else {
      newEvents.push({
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created",
        timestamp: new Date().toISOString(), actor: { id: "system", type: "system" },
        payload: { nodeId: crypto.randomUUID(), kind: 'motor', x: 250, y: 150, width: 150, height: 50, text: 'Main Motor' }
      } as NodeCreatedEvent);
    }
    
    (framework as any).events = newEvents;
    prevEventsLength.current = newEvents.length;
    setTimeIndex(newEvents.length);
    (framework as any).listeners.forEach((l: any) => l((framework as any).events));
    setValidationError(null);
  };

  const addRedundantMotor = () => {
    setValidationError(null);
    const targetNode = nodes.find(n => !n.data.isGhost); // Attach to any existing node
    if (targetNode) {
      const newNodeId = crypto.randomUUID();
      const newEdgeId = crypto.randomUUID();

      const nodeEvent: NodeCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { nodeId: newNodeId, kind: 'motor', x: targetNode.position.x + 200 + (Math.random() * 40 - 20), y: targetNode.position.y + (Math.random() * 40 - 20), width: 150, height: 50, text: 'Redundant Motor' }
      };

      const edgeEvent: EdgeCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { edgeId: newEdgeId, fromNodeId: targetNode.id, toNodeId: newNodeId }
      };

      const proposalEvent: ProposalCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "proposal.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { proposalId: crypto.randomUUID(), title: "Add Redundant Motor", proposedEvents: [nodeEvent, edgeEvent] }
      };
      
      addEvent(proposalEvent);
    }
  };

  const overclockMotor = () => {
    setValidationError("Safety Violation: Motor torque exceeds structural yield limits of connected beam.");
  };

  const makeDbHighlyAvailable = () => {
    setValidationError(null);
    const targetNode = nodes.find(n => !n.data.isGhost && n.type === 'database') || nodes.find(n => !n.data.isGhost);
    if (targetNode) {
      const newNodeId = crypto.randomUUID();
      const newEdgeId = crypto.randomUUID();

      const nodeEvent: NodeCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "node.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { nodeId: newNodeId, kind: 'database', x: targetNode.position.x + 200 + (Math.random() * 40 - 20), y: targetNode.position.y + (Math.random() * 40 - 20), width: 150, height: 50, text: 'DB Replica' }
      };

      const edgeEvent: EdgeCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "edge.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { edgeId: newEdgeId, fromNodeId: targetNode.id, toNodeId: newNodeId }
      };

      const proposalEvent: ProposalCreatedEvent = {
        id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "proposal.created", timestamp: new Date().toISOString(),
        actor: { id: "agent1", type: "llm" },
        payload: { proposalId: crypto.randomUUID(), title: "Make DB Highly Available", proposedEvents: [nodeEvent, edgeEvent] }
      };
      
      addEvent(proposalEvent);
    }
  };

  const makeS3Public = () => {
    setValidationError("Security Violation: Making storage public violates compliance policy.");
  };

  const approveProposal = (proposalId: string) => {
    const proposal = proposalLogLookup.get(proposalId);
    if (!proposal) return;

    const adoptedEvents = proposal.payload.proposedEvents.map(e => {
      if (e.type === 'node.created') {
        const nodePayload = (e as NodeCreatedEvent).payload;
        // Use ephemeral ghost position if the user dragged it, else keep original
        const pos = ghostPositions.current.get(nodePayload.nodeId) ?? { x: nodePayload.x, y: nodePayload.y };
        return {
          ...e,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          payload: { ...nodePayload, x: pos.x, y: pos.y },
        } as NodeCreatedEvent;
      }
      return { ...e, id: crypto.randomUUID(), timestamp: new Date().toISOString() } as EdgeCreatedEvent;
    });

    const resolvedEvent: ProposalResolvedEvent = {
      id: crypto.randomUUID(), boardId: "board_1", branchId: "main", type: "proposal.resolved",
      timestamp: new Date().toISOString(),
      actor: { id: "user1", type: "human" },
      payload: { proposalId, resolution: "approved" }
    };

    // Clear ephemeral positions for this proposal's nodes
    proposal.payload.proposedEvents.forEach(e => {
      if (e.type === 'node.created') {
        ghostPositions.current.delete((e as NodeCreatedEvent).payload.nodeId);
      }
    });

    addEvent(resolvedEvent);
    adoptedEvents.forEach(e => addEvent(e));
    setValidationError(null);
  };

  const pendingProposalsList = useMemo(() => {
    const map = new Map<string, ProposalCreatedEvent>();
    events.forEach(e => {
      if (e.type === 'proposal.created') map.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
      if (e.type === 'proposal.resolved') map.delete((e as ProposalResolvedEvent).payload.proposalId);
    });
    return Array.from(map.values());
  }, [events]);

  const proposalLogLookup = useMemo(() => {
    const map = new Map<string, ProposalCreatedEvent>();
    events.forEach(e => {
      if (e.type === 'proposal.created') map.set((e as ProposalCreatedEvent).payload.proposalId, e as ProposalCreatedEvent);
      if (e.type === 'proposal.resolved') map.delete((e as ProposalResolvedEvent).payload.proposalId);
    });
    return map;
  }, [events]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Top Header for Domain Switching */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 15, fontSize: 14 }}>
          <span>Replayabl Engine</span>
          <select 
            value={domain} 
            onChange={(e) => switchDomain(e.target.value as 'cloud' | 'industrial')}
            style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}
          >
            <option value="industrial">Domain: Industrial Design</option>
            <option value="cloud">Domain: Cloud Infrastructure</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ width: 250, background: '#1e293b', borderRight: '1px solid #334155', padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: 16, color: '#f8fafc', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Components</h3>
          {domain === 'industrial' ? (
            <>
              <div draggable onDragStart={(e) => onDragStart(e, 'motor')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Cpu size={18} color="#94a3b8"/> Motor</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'gear')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Settings size={18} color="#94a3b8"/> Gear</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'beam')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Square size={18} color="#94a3b8"/> Beam</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'sensor')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Activity size={18} color="#94a3b8"/> Sensor</div>
            </>
          ) : (
            <>
              <div draggable onDragStart={(e) => onDragStart(e, 'compute')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Server size={18} color="#94a3b8"/> Compute</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'database')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Database size={18} color="#94a3b8"/> Database</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'storage')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><HardDrive size={18} color="#94a3b8"/> Storage</div>
              <div draggable onDragStart={(e) => onDragStart(e, 'network')} style={{ padding: 12, border: '1px solid #334155', background: '#0f172a', borderRadius: 6, cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Network size={18} color="#94a3b8"/> Network</div>
            </>
          )}
        </div>

        {/* Main Flow */}
        <div style={{ flex: 1, position: 'relative', background: '#0f172a' }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlowProvider>
            <ReactFlow 
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange} 
              onEdgesChange={onEdgesChange} 
              onNodeDragStop={onNodeDragStop}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              colorMode="dark"
            >
              <Background color="#334155" gap={16} />
              <Controls style={{ background: '#1e293b', border: '1px solid #334155', fill: '#94a3b8' }} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Panel */}
        <div style={{ width: 320, background: '#1e293b', borderLeft: '1px solid #334155', padding: 15, display: 'flex', flexDirection: 'column', gap: 15 }}>
          
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Audit Log</h3>
              <button 
                onClick={() => setRawAudit(!rawAudit)}
                style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {rawAudit ? <List size={12} /> : <Code size={12} />}
                {rawAudit ? "UI View" : "Raw JSON"}
              </button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto' }}>
              {rawAudit ? (
                <pre style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  {JSON.stringify(activeEvents, null, 2)}
                </pre>
              ) : (
                activeEvents.slice(-15).map(e => (
                  <div key={e.id} style={{ fontSize: 12, padding: '8px 6px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500', color: '#cbd5e1' }}>{e.type}</span> 
                    <span style={{ color: '#94a3b8', background: '#1e293b', padding: '2px 6px', borderRadius: 4, fontSize: 10, border: '1px solid #334155' }}>
                      {e.actor.type === 'human' ? '🧑 Human' : '🤖 AI'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: 15, borderRadius: 8, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>AI Copilot</h3>
            
            {validationError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '15px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} color="#ef4444" />
                <span style={{ lineHeight: 1.4 }}>{validationError}</span>
              </div>
            )}

            {domain === 'industrial' ? (
              <>
                <button onClick={addRedundantMotor} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', padding: 10, margin: '5px 0', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 0.2s' }}>
                  <CheckCircle size={16} /> Add Redundant Motor
                </button>
                <button onClick={overclockMotor} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', padding: 10, margin: '5px 0', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 0.2s' }}>
                  <XCircle size={16} /> Overclock Motor
                </button>
              </>
            ) : (
              <>
                <button onClick={makeDbHighlyAvailable} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', padding: 10, margin: '5px 0', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 0.2s' }}>
                  <CheckCircle size={16} /> Make DB Highly Available
                </button>
                <button onClick={makeS3Public} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', padding: 10, margin: '5px 0', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background 0.2s' }}>
                  <XCircle size={16} /> Make S3 Public
                </button>
              </>
            )}
            
            {pendingProposalsList.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 12, textTransform: 'uppercase', color: '#94a3b8' }}>Pending Proposals</h4>
                {pendingProposalsList.map(p => (
                  <div key={p.payload.proposalId} style={{ background: 'rgba(74, 222, 128, 0.05)', border: '1px solid #4ade80', padding: 12, borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#4ade80' }}>{p.payload.title}</div>
                    <button onClick={() => approveProposal(p.payload.proposalId)} style={{ display: 'block', width: '100%', padding: 8, background: '#22c55e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'background 0.2s' }}>
                      Approve Proposal
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Travel Slider */}
      <div style={{ background: '#020617', borderTop: '1px solid #334155', padding: '15px 30px', color: 'white', display: 'flex', alignItems: 'center', gap: 20, zIndex: 10 }}>
        <PlaySquare size={24} color="#3b82f6" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', width: 45 }}>Event 0</span>
          <input 
            type="range" 
            min="0" 
            max={events.length} 
            value={timeIndex} 
            onChange={(e) => setTimeIndex(parseInt(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: '#3b82f6' }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8', width: 70 }}>Event {timeIndex} / {events.length}</span>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Replayability Engine
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("app");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
