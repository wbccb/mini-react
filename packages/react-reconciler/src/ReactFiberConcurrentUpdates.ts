import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { SharedQueue, State, Update } from "./ReactFiberClassUpdateQueue.ts";
import { Lane, Lanes, mergeLanes, NoLanes } from "./ReactFiberLane.ts";
import { HostRoot } from "./ReactWorkTags.ts";

function enqueueConcurrentClassUpdate(
	fiber: Fiber,
	queue: SharedQueue<State>,
	update: Update<any>,
	lane: Lane,
): FiberRoot | null {
	enqueueUpdate(fiber, queue, update, lane);
	return getRootForUpdatedFiber(fiber); // 返回FiberRootNode
}

const concurrentQueues: Array<any> = [];
let concurrentQueuesIndex = 0;
let concurrentlyUpdatedLanes: Lanes = NoLanes;

// 这里的enqueueUpdate跟ReactFiberClassUpdateQueue的enqueueUpdate不一样
function enqueueUpdate(
	fiber: Fiber,
	queue: SharedQueue<State>,
	update: Update<State>,
	lane: Lane,
) {
	concurrentQueues[concurrentQueuesIndex++] += fiber;
	concurrentQueues[concurrentQueuesIndex++] += queue;
	concurrentQueues[concurrentQueuesIndex++] += update;
	concurrentQueues[concurrentQueuesIndex++] += lane;

	// 进行fiber.lanes的多种merge
	concurrentlyUpdatedLanes = mergeLanes(concurrentlyUpdatedLanes, lane);

	fiber.lanes = mergeLanes(fiber.lanes, lane);
	const alternate = fiber.alternate;
	if (alternate !== null) {
		// 双缓冲树
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}
}

function getRootForUpdatedFiber(sourceFiber: Fiber): FiberRoot | null {
	let node = sourceFiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = parent.return;
	}
	// 根节点的node.stateNode是FiberRootNode
	return node.tag === HostRoot ? node.stateNode : null;
}

export { enqueueConcurrentClassUpdate };
