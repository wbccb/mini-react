import { Fiber } from "./ReactInternalTypes";
import { RootTag } from "./ReactRootTags";
import { createHostRootFiber } from "./ReactFiber";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { createLaneMap, Lane, Lanes, NoLane, NoLanes } from "./ReactFiberLane";
import { NoTimestamp } from "./ReactFiberWorkLoop";

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

	// TODO 完善这个初始化
	// @ts-ignore
	var initialState: RootState = {
		element: null,
	};
	rootFiber.memoizedState = initialState;

	initializeUpdateQueue(rootFiber);

	return root;
}

export { FiberRootNode, createFiberRoot };
