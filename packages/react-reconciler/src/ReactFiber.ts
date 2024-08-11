import { ConcurrentRoot, RootTag } from "./ReactRootTags.ts";
import {
	ClassComponent,
	HostComponent,
	HostRoot,
	IndeterminateComponent,
	WorkTag,
} from "./ReactWorkTags.ts";
import { State, UpdateQueue } from "./ReactFiberClassUpdateQueue.ts";
import { ConcurrentMode, NoMode, TypeOfMode } from "./ReactTypeOfMode.ts";
import { Lanes, NoLanes } from "./ReactFiberLane.ts";
import { Flags, NoFlags } from "./ReactFiberFlags.ts";
import { ReactElement } from "shared";
import { Fiber } from "./ReactInternalTypes.ts";

export function createHostRootFiber(tag: RootTag) {
	let mode;
	if (tag === ConcurrentRoot) {
		mode = ConcurrentMode;
	} else {
		mode = NoMode;
	}
	// tag => 决定mode的数据
	return createFiber(HostRoot, null, null, mode);
}

function createFiber(tag: WorkTag, pendingProps: any, key: null | string, mode: TypeOfMode) {
	// 这里的tag跟createHostRootFiber的tag是不同类型的！
	return new FiberNode(tag, pendingProps, key, mode);
}

function createFiberFromElement(element: ReactElement, mode: TypeOfMode, lanes: Lanes) {
	const type = element.type;
	const key = element.key;
	const pendingProps = element.props;

	const fiber = createFiberFromTypeAndProps(type, key, pendingProps, element._owner, mode, lanes);

	return fiber;
}

function createFiberFromTypeAndProps(
	type: any, // React$ElementType
	key: null | string,
	pendingProps: any,
	owner: null | Fiber,
	mode: TypeOfMode,
	lanes: Lanes,
) {
	let fiberTag: WorkTag = IndeterminateComponent;
	// 根据type的值去设置fiberTag的值
	if (typeof type === "function" && shouldConstruct(type)) {
		fiberTag = ClassComponent;
	} else if (typeof type === "string") {
		fiberTag = HostComponent;
	}
	// TODO 还有很多fiberTag没识别，后续在识别

	const fiber = createFiber(fiberTag, pendingProps, key, mode);
	fiber.elementType = type;
	fiber.type = type;
	fiber.lanes = lanes;
	return fiber;
}

function shouldConstruct(Component: Function) {
	const prototype = Component.prototype;
	return !!(prototype && prototype.isReactComponent);
}

class FiberNode {
	tag: WorkTag;
	stateNode: any;
	memoizedState: any;
	updateQueue: UpdateQueue<State> | null;
	mode: TypeOfMode;
	elementType: any;
	type: any;
	key: string | null;
	lanes: Lanes;
	childLanes: Lanes;
	alternate: FiberNode | null;

	return: FiberNode | null;
	child: FiberNode | null;
	sibling: FiberNode | null;

	flags: Flags;
	subtreeFlags: Flags;
	deletions: Array<Fiber> | null;

	memoizedProps: any; // 上一次使用的旧的props
	pendingProps: any; // 新的props

	constructor(tag: WorkTag, pendingProps: any, key: string | null, mode: TypeOfMode) {
		this.tag = tag;
		this.mode = mode;
		this.elementType = null;
		this.type = null;
		this.key = key;

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
		this.subtreeFlags = NoFlags;
		this.deletions = [];

		this.memoizedProps = null;
		this.pendingProps = pendingProps;
	}
}

export { FiberNode, createFiber, createFiberFromElement };
