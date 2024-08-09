import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import {
	SharedQueue,
	State,
	Update,
	UpdateQueue,
} from "./ReactFiberClassUpdateQueue.ts";
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

function finishQueueingConcurrentUpdates() {
	// 这里的concurrentQueuesIndex就是enqueueUpdate()的赋值
	const endIndex = concurrentQueuesIndex;
	concurrentQueuesIndex = 0;

	let i = 0;
	while (i < endIndex) {
		const fiber: Fiber = concurrentQueues[i];
		concurrentQueues[i++] = null;

		const updateQueueShared: SharedQueue<State> = concurrentQueues[i];
		concurrentQueues[i++] = null;

		const update: Update<State> = concurrentQueues[i];
		concurrentQueues[i++] = null;

		const lane: Lane = concurrentQueues[i];
		concurrentQueues[i++] = null;

		if (updateQueueShared !== null && update !== null) {
			// queue就是fiber.updateQueue.shared
			const pending = updateQueueShared.pending;

			if (pending === null) {
				update.next = update;
			} else {
				// 链表的后插入元素update操作
				update.next = pending.next;
				pending.next = update;
			}
			updateQueueShared.pending = update;
		}

		if (lane !== NoLanes) {
			markUpdateLaneFromFiberToRoot(fiber, lane);
		}
	}
}
function markUpdateLaneFromFiberToRoot(sourceFiber: Fiber, lane: Lane) {
	sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
	const alternate = sourceFiber.alternate;
	if (alternate !== null) {
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}

	// 将当前lane向上冒泡到对应parentFiber的childrenLanes中
	let parent = sourceFiber.return;
	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane);
		const alternate = parent.alternate;
		if (alternate) {
			alternate.childLanes = mergeLanes(alternate.childLanes, lane);
		}

		parent = parent.return;
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

export { enqueueConcurrentClassUpdate, finishQueueingConcurrentUpdates };
