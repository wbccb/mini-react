import { Fiber } from "./ReactInternalTypes.ts";
import { Update } from "./ReactFiberClassUpdateQueue.ts";
import { Lane } from "./ReactFiberLane.ts";

function enqueueUpdate(fiber: Fiber, update: Update<any>, lane: Lane) {
	const updateQueue = fiber.updateQueue;
}
