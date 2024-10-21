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

export {
	initializeUpdateQueue,
	createUpdate,
	enqueueUpdate,
	scheduleUpdateOnFiber,
	entangleTransitions,
};
