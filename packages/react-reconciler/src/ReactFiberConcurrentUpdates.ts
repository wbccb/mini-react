import { Fiber, FiberRoot } from "./ReactInternalTypes";
import {
	State,
	FiberClassUpdate,
	FiberClassUpdateQueue,
	SharedQueue,
} from "./ReactFiberClassUpdateQueue";
import { Lane, Lanes, mergeLanes, NoLanes } from "./ReactFiberLane";
import { HostRoot } from "./ReactWorkTags";
import type { FiberUpdate, FiberUpdateQueue } from "./ReactFiberHooks";

export type ConcurrentUpdate = {
	next: ConcurrentUpdate;
	lane: Lane;
};
type ConcurrentQueue = {
	pending: ConcurrentUpdate | null;
};

function enqueueConcurrentClassUpdate(
	fiber: Fiber,
	queue: SharedQueue<any>,
	update: FiberClassUpdate<any>,
	lane: Lane,
): FiberRoot | null {
	// 注：react源码就是这样强制转化的
	// TODO 将update压入队列中
	const concurrentQueue: any = queue;
	const concurrentUpdate: ConcurrentUpdate = update as ConcurrentUpdate;
	enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
	return getRootForUpdatedFiber(fiber); // 返回FiberRootNode
}

export function enqueueConcurrentHookUpdate<S, A>(
	fiber: Fiber,
	queue: FiberUpdateQueue<S, A>,
	update: FiberUpdate<S, A>,
	lane: Lane,
): FiberRoot | null {
	const concurrentQueue: any = queue;
	const concurrentUpdate: ConcurrentUpdate = update as ConcurrentUpdate;
	enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
	return getRootForUpdatedFiber(fiber);
}

const concurrentQueues: Array<any> = [];
let concurrentQueuesIndex = 0;
let concurrentlyUpdatedLanes: Lanes = NoLanes;

// 这里的enqueueUpdate跟ReactFiberClassUpdateQueue的enqueueUpdate不一样
function enqueueUpdate(
	fiber: Fiber,
	queue: ConcurrentQueue | null,
	update: ConcurrentUpdate | null,
	lane: Lane,
) {
	concurrentQueues[concurrentQueuesIndex++] = fiber;
	concurrentQueues[concurrentQueuesIndex++] = queue;
	concurrentQueues[concurrentQueuesIndex++] = update;
	concurrentQueues[concurrentQueuesIndex++] = lane;

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

		const updateQueueShared: ConcurrentQueue = concurrentQueues[i];
		concurrentQueues[i++] = null;

		const update: ConcurrentUpdate = concurrentQueues[i];
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

export {
	enqueueConcurrentClassUpdate,
	finishQueueingConcurrentUpdates,
	markUpdateLaneFromFiberToRoot,
};
