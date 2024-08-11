import { Fiber } from "./ReactInternalTypes.ts";
import { RootTag } from "./ReactRootTags.ts";
import { createHostRootFiber } from "./ReactFiber.ts";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue.ts";
import {
	createLaneMap,
	Lane,
	Lanes,
	NoLane,
	NoLanes,
} from "./ReactFiberLane.ts";
import { NoTimestamp } from "./ReactFiberWorkLoop.ts";

export type RootState = {
	element: any;
	isDehydrated: boolean;
	cache: Cache;
};

class FiberRootNode {
	containerInfo: any;
	current?: Fiber;
	tag: RootTag;
	pendingLanes: Lanes;
	eventTimes: any[];
	expirationTimes: any[];
	callbackNode: any;
	callbackPriority: Lane;

	expiredLanes: Lanes; // 如果有lane已经过期，则放在lanes上

	finishedWork: Fiber | null;
	finishedLanes: Lanes;

	constructor(containerInfo: any, tag: RootTag) {
		this.containerInfo = containerInfo;
		this.tag = tag;

		this.pendingLanes = NoLanes;
		this.eventTimes = createLaneMap(NoLanes);
		this.expirationTimes = createLaneMap(NoTimestamp);

		this.callbackNode = null;
		this.callbackPriority = NoLane;

		this.expiredLanes = NoLanes;

		this.finishedWork = null;
		this.finishedLanes = NoLanes;
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
