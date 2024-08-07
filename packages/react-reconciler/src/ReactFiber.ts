import { ConcurrentRoot, RootTag } from "./ReactRootTags.ts";
import { HostRoot, WorkTag } from "./ReactWorkTags.ts";
import { State, UpdateQueue } from "./ReactFiberClassUpdateQueue.ts";
import { ConcurrentMode, NoMode, TypeOfMode } from "./ReactTypeOfMode.ts";
import { Lanes, NoLanes } from "./ReactFiberLane.ts";
import { Flags, NoFlags } from "./ReactFiberFlags.ts";

export function createHostRootFiber(tag: RootTag) {
	let mode;
	if (tag === ConcurrentRoot) {
		mode = ConcurrentMode;
	} else {
		mode = NoMode;
	}
	// tag => 决定mode的数据
	return createFiber(HostRoot, null, mode);
}

function createFiber(tag: WorkTag, pendingProps: any, mode: TypeOfMode) {
	// 这里的tag跟createHostRootFiber的tag是不同类型的！
	return new FiberNode(tag, pendingProps, mode);
}

class FiberNode {
	tag: WorkTag;
	stateNode: any;
	memoizedState: any;
	updateQueue: UpdateQueue<State> | null;
	mode: TypeOfMode;
	lanes: Lanes;
	childLanes: Lanes;
	alternate: FiberNode | null;

	return: FiberNode | null;
	child: FiberNode | null;
	sibling: FiberNode | null;

	flags: Flags;

	memoizedProps: any; // 上一次使用的旧的props
	pendingProps: any; // 新的props

	constructor(tag: WorkTag, pendingProps: any, mode: TypeOfMode) {
		this.tag = tag;
		this.mode = mode;

		// 下面直接为空
		this.stateNode = null;
		this.memoizedState = null;

		this.updateQueue = null;

		this.lanes = NoLanes;
		this.childLanes = NoLanes;

		this.alternate = null;

		// fiber: parent、children、sibling
		this.return = null;
		this.child = null;
		this.sibling = null;

		this.flags = NoFlags;

		this.memoizedProps = null;
		this.pendingProps = pendingProps;
	}
}

export { FiberNode, createFiber };
