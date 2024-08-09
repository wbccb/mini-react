import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";

function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
) {}

export { completeWork };
