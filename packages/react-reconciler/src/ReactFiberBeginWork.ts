import { Fiber } from "./ReactInternalTypes";
import { Lanes, NoLanes } from "./ReactFiberLane";
import {
	ClassComponent,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	IndeterminateComponent,
} from "./ReactWorkTags";
import { RootState } from "./ReactFiberRoot";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { PerformedWork } from "./ReactFiberFlags";
import { renderWithHooks } from "./ReactFiberHooks";
import {
	adoptClassInstance,
	constructClassInstance,
	mountClassInstance,
} from "./ReactFiberClassComponent";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";

function markRef(current: Fiber | null, workInProgress: Fiber) {
	// TOOD 涉及到Ref相关内容在实现
}

/**
 * 1. 对当前workInProgress进行beginWork()处理（reconcileChildren子节点，返回第一个子节点）
 * 2. 返回workInProgress.child子节点
 */
function beginWork(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes): Fiber | null {
	// 记住：当前fiber是已经创建好的，一开始是HostRoot（初始化就创建好的fiber)->reconcileChildren()创建fiber.child
	// completeOfWork()切换当前fiber从HostRoot->上面创建的HostRoot.child作为当前fiber，然后继续reconcileChildren()创建当前fiber.child
	// 然后继续completeOfWork()切换当前fiber为新创建的fiber

	// 根据已经创建好的fiber，比对children，进行Flags的标记：能复用的打上Update标签，需要新增或者插入的打上Placement标签，需要调用生命周期的打上Snapshot
	// 返回当前fiber的第一个child fiber

	workInProgress.lanes = NoLanes;
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(current, workInProgress, renderLanes);
		case HostComponent:
			return updateHostComponent(current, workInProgress, renderLanes);
		case HostText:
			return updateHostText(current, workInProgress, renderLanes);
		case Fragment:
			return updateFragment(current, workInProgress, renderLanes);
		case IndeterminateComponent:
			return mountIndeterminateComponent(current, workInProgress, workInProgress.type, renderLanes);
		case ClassComponent:
			const _Component = workInProgress.type;
			const props = workInProgress.pendingProps;
			return updateClassComponent(current, workInProgress, _Component, props, renderLanes);
	}

	// 至于当前fiber的children的fiber构建，会在completeUnitOfWork()迭代方法中触发
	// 当然，当前fiber.children.sibling以及fiber.child.child会在completeUnitOfWork()迭代方法中触发

	throw new Error(
		`Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
			"React. Please file an issue.",
	);
}

function reconcileChildren(
	current: Fiber | null,
	workInProgress: Fiber,
	nextChildren: any,
	renderLanes: Lanes,
) {
	if (current === null) {
		workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
	} else {
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current.child,
			nextChildren,
			renderLanes,
		);
	}
}

function updateHostRoot(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	// TODO 后续再完善prevChildren与nextChildren的对比
	// const prevState = workInProgress.memoizedState;
	// const prevChildren = prevState.element;
	// cloneUpdateQueue(current, workInProgress);
	const nextProps = workInProgress.pendingProps;
	// TODO 提取队列的update生成memoizedState对象
	// 将workInProgress的updateQueue.shared.pending提取出来塞到memoizedState
	processUpdateQueue(workInProgress, nextProps, null, renderLanes);
	const nextState: RootState = workInProgress.memoizedState;
	const nextChildren = nextState.element; //element本质就是jsx解析出来的children数据

	reconcileChildren(current, workInProgress, nextChildren, renderLanes);

	return workInProgress.child;
}

function updateHostComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const nextProps = workInProgress.pendingProps;
	const nextChildren = nextProps.children;

	markRef(current, workInProgress);
	reconcileChildren(current, workInProgress, nextChildren, renderLanes);
	return workInProgress.child;
}

function updateHostText(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	return null;
}

function updateFragment(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const newNextChildren = workInProgress.pendingProps.children;
	reconcileChildren(current, workInProgress, newNextChildren, renderLanes);
	return workInProgress.child;
}

function mountIndeterminateComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: any, // workInProgress.type
	renderLanes: Lanes,
): Fiber | null {
	const props = workInProgress.pendingProps; // 在createFiberFromElement()中获取fiber.props赋值给pendingProps，其中fiber.props是jsx自动解析获取的props数据
	const value: any = renderWithHooks(null, workInProgress, Component, props, renderLanes);

	workInProgress.flags |= PerformedWork;
	if (
		typeof value === "object" &&
		value !== null &&
		typeof value.render === "function" &&
		value.$$typeof === undefined
	) {
		workInProgress.tag = ClassComponent;
		adoptClassInstance(workInProgress, value);
		mountClassInstance(workInProgress, Component, props, renderLanes);
		return finishClassComponent(current, workInProgress, Component, props, renderLanes);
	} else {
		workInProgress.tag = FunctionComponent;
		reconcileChildren(null, workInProgress, value, renderLanes);
		return workInProgress.child;
	}
}

function updateClassComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: any, // workInProgress.type
	nextProps: any,
	renderLanes: Lanes,
) {
	const instance = workInProgress.stateNode;
	let shouldUpdate;

	if (instance === null) {
		constructClassInstance(workInProgress, Component, nextProps);
		mountClassInstance(workInProgress, Component, nextProps, renderLanes);
		shouldUpdate = true;
	}

	const nextUnitOfWork = finishClassComponent(
		current,
		workInProgress,
		Component,
		shouldUpdate,
		renderLanes,
	);
	return nextUnitOfWork;
}

function finishClassComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: any, // workInProgress.type
	nextProps: any,
	renderLanes: Lanes,
) {
	let instance = workInProgress.stateNode;

	const nextChildren = instance.render();
	workInProgress.flags |= PerformedWork;

	reconcileChildren(current, workInProgress, nextChildren, renderLanes);
	workInProgress.memoizedState = instance.state;
	return workInProgress.child;
}

export { beginWork };
