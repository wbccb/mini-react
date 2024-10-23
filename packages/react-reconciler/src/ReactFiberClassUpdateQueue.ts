import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { Lane, Lanes, markRootUpdated, NoLanes, SyncLane } from "./ReactFiberLane";
import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates";
import { ensureRootIsScheduled } from "./ReactFiberWorkLoop";

export type State = {};
export type FiberClassUpdate<State> = {
	eventTime: number;
	lane: Lane;

	payload: any;

	next: FiberClassUpdate<State> | null;
};

export type SharedQueue<State> = {
	pending: FiberClassUpdate<State> | null;
	lanes: Lanes;
};

export type FiberClassUpdateQueue<State> = {
	baseState: State;
	firstBaseUpdate: FiberClassUpdate<State> | null;
	lastBaseUpdate: FiberClassUpdate<State> | null;

	shared: SharedQueue<State>;
};

function initializeUpdateQueue(fiber: Fiber) {
	const queue: FiberClassUpdateQueue<State> = {
		baseState: fiber.memoizedState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
		shared: {
			pending: null,
			lanes: NoLanes,
		},
	};
	fiber.updateQueue = queue;
}

function createUpdate(eventTime: number, lane: Lane) {
	const update: FiberClassUpdate<any> = {
		eventTime,
		lane,

		payload: null,
		next: null,
	};
	return update;
}

function enqueueUpdate(fiber: Fiber, update: FiberClassUpdate<any>, lane: Lane): FiberRoot | null {
	const updateQueue = fiber.updateQueue;
	if (updateQueue === null) {
		return null;
	}

	const sharedQueue: SharedQueue<State> = updateQueue.shared;
	return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}

function scheduleUpdateOnFiber(root: FiberRoot, fiber: Fiber, lane: Lane, eventTime: number) {
	markRootUpdated(root, lane, eventTime);
	ensureRootIsScheduled(root, eventTime);

	// TODO 后续再实现，我觉得这个部分是有价值的
	// if (
	// 	lane === SyncLane &&
	// 	executionContext === NoContext &&
	// 	(fiber.mode & ConcurrentMode) === NoMode
	// ) {
	// 	resetRenderTimer();
	// 	flushSyncCallbacksOnlyInLegacyMode();
	// }
}

function entangleTransitions(root: FiberRoot, fiber: Fiber, lane: Lane) {
	// TODO 并发时再实现
}

function processUpdateQueue(workInProgress: Fiber, props: any, instance: any, renderLanes: Lanes) {
	const queue = workInProgress.updateQueue as FiberClassUpdateQueue<State>;
	let pendingQueue = queue.shared.pending;
	if (pendingQueue !== null) {
		// 经过enqueuQueue压入队列
		// finishQueueingConcurrentUpdates进行queue.pending的构建，赋值给fiber.queue
		// 获取fiber.queue.shared.pending，然后构建出children数据
		// TODO 实现提取逻辑，需要简化原来的react代码
		let newState = queue.shared.pending?.payload;
		workInProgress.memoizedState = newState;
	}
}

export {
	initializeUpdateQueue,
	createUpdate,
	enqueueUpdate,
	scheduleUpdateOnFiber,
	entangleTransitions,
	processUpdateQueue,
};
