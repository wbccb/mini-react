import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes, NoLanes } from "./ReactFiberLane.ts";
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	IndeterminateComponent,
} from "./ReactWorkTags.ts";
import { RootState } from "./ReactFiberRoot.ts";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber.ts";

/**
 * 1. 对当前workInProgress进行beginWork()处理（reconcileChildren子节点，返回第一个子节点）
 * 2. 返回workInProgress.child子节点
 */
function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber {
	// 创建当前fiber
	// 比对children，进行Flags的标记：能复用的打上Update标签，需要新增或者插入的打上Placement标签，需要调用生命周期的打上Snapshot
	// 返回当前fiber的第一个child fiber

	workInProgress.lanes = NoLanes;
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(current, workInProgress, renderLanes);
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
		workInProgress.child = mountChildFibers(
			workInProgress,
			null,
			nextChildren,
			renderLanes,
		);
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
): Fiber {
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

export { beginWork };
