import { Fiber } from "./ReactInternalTypes.ts";

export type State = {};
export type Update<State> = {
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

export { initializeUpdateQueue };
