import { RootTag } from "./ReactRootTags.ts";
import { WorkTag } from "./ReactWorkTags.ts";
import { State, UpdateQueue } from "./ReactFiberClassUpdateQueue.ts";

export function createHostRootFiber(tag: RootTag) {
	return createFiber(tag);
}

function createFiber(tag: WorkTag) {
	return new FiberNode(tag);
}

class FiberNode {
	tag: WorkTag;
	stateNode: any;
	memoizedState: any;
	updateQueue: UpdateQueue<State> | null;

	constructor(tag: WorkTag) {
		this.tag = tag;
		this.stateNode = null;
		this.memoizedState = null;

		this.updateQueue = null;
	}
}

export { FiberNode };
