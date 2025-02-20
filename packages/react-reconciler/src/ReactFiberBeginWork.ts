import { Fiber } from "./ReactInternalTypes";
import { Lanes, mergeLanes, NoLanes } from "./ReactFiberLane";
import {
	ClassComponent,
	ContextConsumer,
	ContextProvider,
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
import { bailoutHooks, renderWithHooks, useContext } from "./ReactFiberHooks";
import {
	adoptClassInstance,
	constructClassInstance,
	mountClassInstance,
} from "./ReactFiberClassComponent";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { ReactContext } from "shared";
import objectIs from "shared/src/objectIs";
import { prepareToReadContext, pushProvider } from "./ReactFiberNewContext";
import { scheduleContextWorkOnParentPath } from "react";

function markRef(current: Fiber | null, workInProgress: Fiber) {
	// TOOD 涉及到Ref相关内容在实现
}

/**
 * 1. 对当前workInProgress进行beginWork()处理（reconcileChildren子节点，返回第一个子节点）
 * 2. 返回workInProgress.child子节点
 */
let didReceiveUpdate = false;

function beginWork(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes): Fiber | null {
	// 记住：当前fiber是已经创建好的，一开始是HostRoot（初始化就创建好的fiber)->reconcileChildren()创建fiber.child
	// completeOfWork()切换当前fiber从HostRoot->上面创建的HostRoot.child作为当前fiber，然后继续reconcileChildren()创建当前fiber.child
	// 然后继续completeOfWork()切换当前fiber为新创建的fiber

	// 根据已经创建好的fiber，比对children，进行Flags的标记：能复用的打上Update标签，需要新增或者插入的打上Placement标签，需要调用生命周期的打上Snapshot
	// 返回当前fiber的第一个child fiber
	if (current !== null) {
		const oldProps = current.memoizedProps;
		const newProps = workInProgress.pendingProps;

		if (oldProps !== newProps) {
			didReceiveUpdate = true;
		} else {
			didReceiveUpdate = false;
		}
	} else {
		didReceiveUpdate = false;
	}

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
		case FunctionComponent: {
			var Component = workInProgress.type;
			var unresolvedProps = workInProgress.pendingProps;
			return updateFunctionComponent(
				current,
				workInProgress,
				Component,
				unresolvedProps,
				renderLanes,
			);
		}
		case ClassComponent:
			const _Component = workInProgress.type;
			const props = workInProgress.pendingProps;
			return updateClassComponent(current, workInProgress, _Component, props, renderLanes);
		case ContextProvider:
			return updateContextProvider(current, workInProgress, renderLanes);
		case ContextConsumer:
			return updateContextConsumer(current, workInProgress, renderLanes);
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
	prepareToReadContext(workInProgress, renderLanes);

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

export function markWorkInProgressReceivedUpdate() {
	didReceiveUpdate = true;
}

function updateFunctionComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: any, // workInProgress.type
	nextProps: any,
	renderLanes: Lanes,
) {
	prepareToReadContext(workInProgress, renderLanes);
	const nextChildren: any = renderWithHooks(
		current,
		workInProgress,
		Component,
		nextProps,
		renderLanes,
	);

	if (current !== null && !didReceiveUpdate) {
		bailoutHooks(current, workInProgress, renderLanes);
		return bailoutOnAlreadyFinishedWork();
	}

	workInProgress.flags |= PerformedWork;
	// 省略bailoutOnAlreadyFinishedWork逻辑
	reconcileChildren(current, workInProgress, nextChildren, renderLanes);
	return workInProgress.child;
}

function bailoutOnAlreadyFinishedWork() {
	// 如果有更新的，则复制fiber
	// 如果fiber.lanes没有需要更新，直接返回null
	return null;
}

function updateClassComponent(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: any, // workInProgress.type
	nextProps: any,
	renderLanes: Lanes,
) {
	prepareToReadContext(workInProgress, renderLanes);
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

function updateContextProvider(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes) {
	// jsx转化为：
	// {
	// 	$$typeof: Symbol(react.element),
	// 		type: Context.Provider, // 关键属性
	//  	props: { value, children },
	// }

	// Context.Provider = {
	//   $$typeof: REACT_PROVIDER_TYPE,
	//   _context: context,
	// };

	const providerType = workInProgress.type;
	const context = providerType._context;
	const newProps = workInProgress.pendingProps;
	const newValue = newProps.value; // <Context.Provider value={}/>
	const oldProps = workInProgress.memoizedProps;

	pushProvider(workInProgress, context, newValue);

	if (oldProps !== null) {
		const oldValue = oldProps.value;
		if (objectIs(oldValue, newValue)) {
			if (oldProps.children === newProps.children) {
				return bailoutOnAlreadyFinishedWork();
			}
		} else {
			// 值改变了，需要动态通知childrenFiber，也就是遍历所有childFiber，然后给他们打上fiber.lanes = XXX以及创建对应的update放入到fiber.updateQueue中
			propagateContextChange(workInProgress, context, renderLanes);
		}
	}

	const newChildren = newProps.children;
	reconcileChildren(current, workInProgress, newChildren, renderLanes);
	return workInProgress.child;
}

function propagateContextChange(workInProgress: Fiber, context: ReactContext, renderLanes: Lanes) {
	propagateContextChange_eager(workInProgress, context, renderLanes);
}

// 深度遍历当前fiber的所有子fiber，找到有使用Context的地方
function propagateContextChange_eager(
	workInProgress: Fiber,
	context: ReactContext,
	renderLanes: Lanes,
) {
	// parent -> children -> null -> children.sibling -> children.return -> children.sibling

	function checkFiberSibling(fiber: Fiber) {
		if (fiber.sibling) {
			fiber.sibling.return = fiber.return;
			fiber = fiber.sibling;
		} else {
			while (!fiber.sibling) {
				fiber = fiber.return!;
				if (fiber === workInProgress) {
					return fiber;
				}
			}

			if (fiber === workInProgress) {
				return fiber;
			}

			fiber.sibling!.return = fiber.return;
			fiber = fiber.sibling;
		}
		return fiber;
	}

	let fiber = workInProgress.child;
	if (fiber) {
		fiber.return = workInProgress;
	}
	while (fiber) {
		let list = fiber.dependencies;
		if (list !== null) {
			let dependency = list.firstContext;
			while (dependency) {
				if (dependency.context === context) {
					// 说明fiber可以标记了，不需要继续遍历该fiber剩余的useContext

					// TODO ClassComponent??

					fiber.lanes = mergeLanes(fiber.lanes, renderLanes);
					const alternate = fiber.alternate;
					if (alternate !== null) {
						alternate.lanes = mergeLanes(alternate.lanes, renderLanes);
					}

					scheduleContextWorkOnParentPath(fiber.return, renderLanes, workInProgress);

					break;
				}

				dependency = dependency.next;
			}
		} else if (fiber.tag === ContextProvider) {
			if (fiber.type === workInProgress.type) {
				// 同一个Context，由最近一个Context提供value

				// 尝试sibling是否可以
				fiber = checkFiberSibling(fiber);
				if (fiber === workInProgress) {
					break;
				}
				continue;
			}
		}

		if (fiber.child) {
			fiber.child.return = fiber;
			fiber = fiber.child;
		} else {
			fiber = checkFiberSibling(fiber);
			if (fiber === workInProgress) {
				break;
			}
		}
	}
}

function updateContextConsumer(current: Fiber | null, workInProgress: Fiber, renderLanes: Lanes) {
	const context = workInProgress.type;

	// 获取<Context.Consumer></Context.Consumer>包裹的内容，也就是children属性(JSX转化)
	const newProps = workInProgress.pendingProps;
	const render = newProps.children;

	prepareToReadContext(workInProgress, renderLanes);
	// 模拟FunctionComponent中遇到useContext()

	// 由于每次压入<Context.Provider>时都会更新当前Context的值，遇到</Context.Provider>会弹出当前的值+恢复上一次的值
	// 因此context._currentValue就是目前Context的最新值，不用考虑最近的Context是哪个！
	const newValue = useContext(context);

	const newChildren = render(newValue);

	reconcileChildren(current, workInProgress, newChildren, renderLanes);
	return workInProgress.child;
}

export { beginWork };
