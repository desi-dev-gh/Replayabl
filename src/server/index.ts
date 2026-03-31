import Database from "better-sqlite3";
import express from "express";
import cors from "cors";
import path from "node:path";
import { type WhiteboardEvent } from "../core/events";
import { seedWhiteboardEvents } from "../examples/demo-events";

// 1. Initialize SQLite
const dbPath = path.resolve(process.cwd(), "replayabl.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL"); // Better concurrency

// 2. Define the Event Store Schema
// The UNIQUE constraint on (boardId, branchId, sequence) enforces OCC natively.
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    boardId TEXT NOT NULL,
    branchId TEXT NOT NULL,
    parentEventId TEXT,
    sequence INTEGER NOT NULL,
    schemaVersion INTEGER NOT NULL,
    type TEXT NOT NULL,
    actorId TEXT NOT NULL,
    actorType TEXT NOT NULL,
    actorLabel TEXT,
    timestamp DATETIME NOT NULL,
    payload JSON NOT NULL,
    meta JSON,
    UNIQUE(boardId, branchId, sequence)
  );
  
  CREATE INDEX IF NOT EXISTS idx_events_replay 
  ON events(boardId, branchId, sequence ASC);
`);

// Prepared statements for performance
const insertEventStmt = db.prepare(`
  INSERT INTO events (
    id, boardId, branchId, parentEventId, sequence, schemaVersion, 
    type, actorId, actorType, actorLabel, timestamp, payload, meta
  ) VALUES (
    @id, @boardId, @branchId, @parentEventId, @sequence, @schemaVersion,
    @type, @actorId, @actorType, @actorLabel, @timestamp, @payload, @meta
  )
`);

const getEventsStmt = db.prepare(`
  SELECT * FROM events 
  WHERE boardId = ? AND branchId = ? 
  ORDER BY sequence ASC
`);

const getEventIdsStmt = db.prepare(`
  SELECT id FROM events
  WHERE boardId = ? AND branchId = ?
`);

function toInsertRow(event: WhiteboardEvent) {
  return {
    id: event.id,
    boardId: event.boardId,
    branchId: event.branchId,
    parentEventId: event.parentEventId || null,
    sequence: event.sequence,
    schemaVersion: event.schemaVersion || 1,
    type: event.type,
    actorId: event.actor.id,
    actorType: event.actor.type,
    actorLabel: event.actor.label || null,
    timestamp: event.timestamp,
    payload: JSON.stringify(event.payload),
    meta: event.meta ? JSON.stringify(event.meta) : null,
  };
}

function ensureDemoSeedEvents(): void {
  const boardId = "board_1";
  const branchId = "main";
  const existingIds = new Set(
    (getEventIdsStmt.all(boardId, branchId) as Array<{ id: string }>).map((row) => row.id)
  );
  const missingSeedEvents = seedWhiteboardEvents.filter((event) => !existingIds.has(event.id));

  if (missingSeedEvents.length === 0) {
    return;
  }

  const insertMissingSeedEvents = db.transaction((events: WhiteboardEvent[]) => {
    for (const event of events) {
      insertEventStmt.run(toInsertRow(event));
    }
  });

  insertMissingSeedEvents(missingSeedEvents);
}

ensureDemoSeedEvents();

// 3. Setup Express API
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to fetch the event log for replay
app.get("/api/boards/:boardId/branches/:branchId/events", (req, res) => {
  const { boardId, branchId } = req.params;
  
  try {
    const rawEvents = getEventsStmt.all(boardId, branchId) as any[];
    
    // Map DB rows back to TypeScript EventEnvelopes
    const events: WhiteboardEvent[] = rawEvents.map(row => ({
      id: row.id,
      boardId: row.boardId,
      branchId: row.branchId,
      parentEventId: row.parentEventId,
      sequence: row.sequence,
      schemaVersion: row.schemaVersion,
      type: row.type,
      timestamp: row.timestamp,
      actor: {
        id: row.actorId,
        type: row.actorType,
        label: row.actorLabel,
      },
      payload: JSON.parse(row.payload),
      meta: row.meta ? JSON.parse(row.meta) : undefined,
    } as any));

    res.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to append a new event (with OCC enforced by SQLite)
app.post("/api/events", (req, res) => {
  const event = req.body as WhiteboardEvent;

  try {
    insertEventStmt.run(toInsertRow(event));
    
    res.json({ success: true, eventId: event.id });
  } catch (error: any) {
    // If our Sequence + Branch UNIQUE constraint is violated
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ 
        error: "Optimistic Concurrency Control (OCC) Failed", 
        message: "The sequence number is already taken. Please pull the latest state and retry." 
      });
      return;
    }
    
    console.error("Failed to append event:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Replayabl Event Store running on http://localhost:${PORT}`);
});