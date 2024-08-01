import { Fiber } from "./ReactInternalTypes.ts";
import { RootTag } from "./ReactRootTags.ts";
import { createHostRootFiber } from "./ReactFiber.ts";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue.ts";

export type RootState = {};

class FiberRootNode {
	containerInfo: any;
	current?: Fiber;
	tag: RootTag;

	constructor(containerInfo: any, tag: RootTag) {
		this.containerInfo = containerInfo;
		this.tag = tag;
	}
}

function createFiberRoot(container: any, tag: RootTag) {
	const root = new FiberRootNode(container, tag);
	const rootFiber = createHostRootFiber(tag);

	root.current = rootFiber;
	rootFiber.stateNode = root;

	var initialState: RootState = {};
	rootFiber.memoizedState = initialState;

	initializeUpdateQueue(rootFiber);

	return root;
}

export { FiberRootNode, createFiberRoot };
