import { Lane, Lanes, NoLanes } from "./ReactFiberLane.ts";
import { Fiber } from "./ReactInternalTypes.ts";

type ExecutionContext = number;

const NoTimestamp = -1;
let currentEventTime: number = NoTimestamp;
let currentEventTransitionLane: Lanes = NoLanes;

const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
const CommitContext = /*                */ 0b100;
let executionContext: ExecutionContext = NoContext;

function now() {
	return window.performance.now();
}

function requestEventTime() {
	if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
		// We're inside React, so it's fine to read the actual time.
		return now();
	}
	// We're not inside React, so we may be in the middle of a browser event.
	if (currentEventTime !== NoTimestamp) {
		// Use the same start time for all updates until we enter React again.
		return currentEventTime;
	}
	// This is the first update since React yielded. Compute a new start time.
	currentEventTime = now();
	return currentEventTime;
}

function requestUpdateLane(fiber: Fiber): Lane {}

export { NoTimestamp, NoContext, requestEventTime, requestUpdateLane };
