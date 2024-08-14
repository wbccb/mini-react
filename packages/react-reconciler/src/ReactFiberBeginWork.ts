import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes, NoLanes } from "./ReactFiberLane.ts";
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	IndeterminateComponent,
} from "./ReactWorkTags.ts";
import { RootState } from "./ReactFiberRoot.ts";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber.ts";

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
	// processUpdateQueue(workInProgress, nextProps, null, renderLanes);
	const nextState: RootState = workInProgress.memoizedState;
	const nextChildren = nextState.element;

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
	const newNextChildren = workInProgress.pendingProps;
	reconcileChildren(current, workInProgress, newNextChildren, renderLanes);
	return workInProgress.child;
}

export { beginWork };
