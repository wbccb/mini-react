import { ConcurrentRoot, RootTag } from "./ReactRootTags";
import {
	ClassComponent,
	ContextConsumer,
	ContextProvider,
	Fragment,
	HostComponent,
	HostRoot,
	HostText,
	IndeterminateComponent,
	WorkTag,
} from "./ReactWorkTags";
import { State, FiberClassUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { ConcurrentMode, NoMode, TypeOfMode } from "./ReactTypeOfMode";
import { Lanes, NoLanes } from "./ReactFiberLane";
import { Flags, NoFlags, StaticMask } from "./ReactFiberFlags";
import { REACT_CONTEXT_TYPE, REACT_FRAGMENT_TYPE, REACT_PROVIDER_TYPE, ReactElement } from "shared";
import { Dependencies, Fiber } from "./ReactInternalTypes";

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

function createFiberFromText(content: string, mode: TypeOfMode, lanes: Lanes) {
	const fiber = createFiber(HostText, content, null, mode);
	fiber.lanes = lanes;
	return fiber;
}

function createFiberFromElement(element: ReactElement, mode: TypeOfMode, lanes: Lanes) {
	const type = element.type;
	const key = element.key;
	const pendingProps = element.props; // 本质就是jsx自动解析出来的children数据，就是jsx.props里面自己就带了children数据，不是react自己去转化

	const fiber = createFiberFromTypeAndProps(type, key, pendingProps, element._owner, mode, lanes);

	return fiber;
}

function createFiberFromFragments(
	elements: ReactElement[],
	mode: TypeOfMode,
	lanes: Lanes,
	key: string | null,
) {
	const fiber = createFiber(Fragment, elements, key, mode);
	fiber.lanes = lanes;
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
	if (typeof type === "function") {
		if (shouldConstruct(type)) {
			// FunctionComponent初始设置tag=IndeterminateComponent
			fiberTag = ClassComponent;
		}
	} else if (typeof type === "string") {
		fiberTag = HostComponent;
	} else if (type === REACT_FRAGMENT_TYPE) {
		fiberTag = Fragment;
	} else {
		switch (type) {
			default:
				if (typeof type === "object" && type !== null) {
					switch (type.$$typeof) {
						case REACT_PROVIDER_TYPE:
							fiberTag = ContextProvider;
							break;
						case REACT_CONTEXT_TYPE:
							fiberTag = ContextConsumer;
							break;
					}
				}
		}
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
	updateQueue: FiberClassUpdateQueue<State> | string[] | null;
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

	dependencies: Dependencies | null;

	index: number;

	$$typeof?: Symbol;

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

		this.index = 0;

		this.dependencies = null;
	}
}

function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
	let workInProgress = current.alternate;
	if (workInProgress === null) {
		workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
		workInProgress.type = current.type;
		workInProgress.elementType = current.elementType;
		workInProgress.stateNode = current.stateNode;

		workInProgress.alternate = current; // workInProgress和current相关邦定
		current.alternate = workInProgress;
	}

	// TODO 为什么要 & StaticMask?
	workInProgress.flags = current.flags & StaticMask;
	workInProgress.childLanes = current.childLanes;
	workInProgress.lanes = current.lanes;

	workInProgress.child = current.child;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.updateQueue = current.updateQueue;

	workInProgress.sibling = current.sibling;
	workInProgress.index = current.index;

	workInProgress.pendingProps = pendingProps;

	return workInProgress;
}

export {
	FiberNode,
	createFiber,
	createFiberFromElement,
	createFiberFromText,
	createWorkInProgress,
	createFiberFromFragments,
};
