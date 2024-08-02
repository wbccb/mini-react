import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { Lane } from "./ReactFiberLane.ts";

export type State = {};
export type Update<State> = {
	eventTime: number;
	lane: Lane;

	payload: any;

	next: Update<State> | null;
};
export type UpdateQueue<State> = {
	baseState: State;
	firstBaseUpdate: Update<State> | null;
	lastBaseUpdate: Update<State> | null;
};

function initializeUpdateQueue(fiber: Fiber) {
	const queue: UpdateQueue<State> = {
		baseState: fiber.memoizedState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
	};
	fiber.updateQueue = queue;
}

function createUpdate(eventTime: number, lane: Lane) {
	const update: Update<any> = {
		eventTime,
		lane,

		payload: null,
	};
	return update;
}

function enqueueUpdate(
	fiber: Fiber,
	update: Update<any>,
	lane: Lane,
): FiberRoot | null {}

function scheduleUpdateOnFiber(
	root: FiberRoot,
	fiber: Fiber,
	lane: Lane,
	eventTime: number,
) {}

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
