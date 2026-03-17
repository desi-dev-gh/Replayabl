import { replayEvents } from "../core";
import { seedWhiteboardEvents } from "./demo-events";

const state = replayEvents(seedWhiteboardEvents);

console.log(JSON.stringify(state, null, 2));
