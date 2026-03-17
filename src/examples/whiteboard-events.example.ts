import { replayEvents, WhiteboardEvent } from "../core";

const events: WhiteboardEvent[] = [
  {
    id: "evt_1",
    boardId: "board_1",
    branchId: "main",
    parentEventId: null,
    actor: { type: "human", id: "aditya", label: "Aditya" },
    type: "board.created",
    timestamp: "2026-03-17T16:00:00.000Z",
    payload: {
      title: "Replayabl Whiteboard Demo",
      description: "Human + AI shared event history",
    },
  },
  {
    id: "evt_2",
    boardId: "board_1",
    branchId: "main",
    parentEventId: "evt_1",
    actor: { type: "human", id: "aditya", label: "Aditya" },
    type: "node.created",
    timestamp: "2026-03-17T16:00:05.000Z",
    payload: {
      nodeId: "node_problem",
      kind: "note",
      x: 120,
      y: 100,
      width: 220,
      height: 120,
      text: "Legacy apps treat AI as an outsider.",
    },
  },
  {
    id: "evt_3",
    boardId: "board_1",
    branchId: "main",
    parentEventId: "evt_2",
    actor: { type: "human", id: "aditya", label: "Aditya" },
    type: "node.created",
    timestamp: "2026-03-17T16:00:07.000Z",
    payload: {
      nodeId: "node_solution",
      kind: "note",
      x: 460,
      y: 100,
      width: 240,
      height: 120,
      text: "Replayabl makes humans and LLMs write to the same event history.",
    },
  },
  {
    id: "evt_4",
    boardId: "board_1",
    branchId: "main",
    parentEventId: "evt_3",
    actor: { type: "human", id: "aditya", label: "Aditya" },
    type: "edge.created",
    timestamp: "2026-03-17T16:00:10.000Z",
    payload: {
      edgeId: "edge_1",
      fromNodeId: "node_problem",
      toNodeId: "node_solution",
      label: "motivation",
    },
  },
  {
    id: "evt_5",
    boardId: "board_1",
    branchId: "main",
    parentEventId: "evt_4",
    actor: { type: "llm", id: "assistant", label: "Kandy" },
    type: "proposal.created",
    timestamp: "2026-03-17T16:00:15.000Z",
    payload: {
      proposalId: "proposal_1",
      title: "Group the core idea",
      description: "Create a visual cluster around the two nodes.",
      proposedEvents: [
        {
          id: "evt_6",
          boardId: "board_1",
          branchId: "main",
          parentEventId: "evt_5",
          actor: { type: "llm", id: "assistant", label: "Kandy" },
          type: "group.created",
          timestamp: "2026-03-17T16:00:16.000Z",
          payload: {
            groupId: "group_core_idea",
            title: "Core Thesis",
            memberIds: ["node_problem", "node_solution"],
          },
        },
      ],
    },
    meta: {
      source: "agent",
      approvalStatus: "pending",
      reasoning: "Grouping the problem and solution clarifies the narrative.",
    },
  },
];

const state = replayEvents(events);

console.log(JSON.stringify(state, null, 2));
