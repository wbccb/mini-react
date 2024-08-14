import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes, mergeLanes, NoLane, NoLanes } from "./ReactFiberLane.ts";
import {
	ClassComponent,
	Fragment,
	HostComponent,
	HostRoot,
	HostText,
	IndeterminateComponent,
} from "./ReactWorkTags.ts";
import { NoFlags, Snapshot } from "./ReactFiberFlags.ts";

function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const newProps = workInProgress.pendingProps; // 存储了children数据！！可以看文章reconcileSingleElement()的分析

	switch (workInProgress.tag) {
		case HostComponent: {
			const type = workInProgress.type;
			if (current !== null && workInProgress.stateNode !== null) {
				// 更新逻辑
			} else {
				const instance = createInstance(type); // 创建dom
				appendAllChildren(instance, workInProgress); //
				workInProgress.stateNode = instance;
				finalizeInitialChildren(instance, type);
			}
			bubbleProperties(workInProgress);
			return null;
		}
		case HostRoot: {
			workInProgress.flags |= Snapshot;
			bubbleProperties(workInProgress);
			return null;
		}
		case HostText: {
			workInProgress.stateNode = document.createTextNode(newProps);
			bubbleProperties(workInProgress);
			return null;
		}
		case IndeterminateComponent:
		case Fragment:
		case ClassComponent: {
			bubbleProperties(workInProgress);
			return null;
		}
	}

	throw new Error(
		`Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
			"React. Please file an issue.",
	);
}

function createInstance(type: string) {
	const domElement = document.createElement(type);
	return domElement;
}

function appendAllChildren(currentFiberDom: HTMLElement, workInProgress: Fiber) {
	// dom是当前workInProgress.stateNode
	// 将workInProgress的所有（第一层级）childFiber对应的stateNode都与dom关联

	let childFiber = workInProgress.child;
	const parentDom = currentFiberDom;
	while (childFiber !== null) {
		if (childFiber.tag === HostComponent || childFiber.tag === HostText) {
			// 证明node是有DOM的！
			parentDom.appendChild(childFiber.stateNode);
		} else if (childFiber.child !== null) {
			childFiber.child.return = childFiber;
			childFiber = childFiber.child; // 比如<><div></div><>情况，这个<div>也算第一层级！
			continue;
		}

		// 寻找它的sibling节点
		if (childFiber === workInProgress) {
			return;
		}
		while (childFiber.sibling === null) {
			// 因为<><div></div><>的存在，我们得向上寻找sibling节点
			if (childFiber.return === null || childFiber.return === workInProgress) {
				return;
			}
			childFiber = childFiber.return;
		}

		childFiber.sibling.return = childFiber.return;
		childFiber = childFiber.sibling;
	}
}
function finalizeInitialChildren(dom: HTMLElement, type: string) {
	// TODO 初始化dom属性，后续再完善
}

function bubbleProperties(workInProgress: Fiber) {
	const didBailout =
		workInProgress.alternate !== null && workInProgress.alternate.child === workInProgress.child;

	let newChildLanes = NoLanes;
	let child = workInProgress.child;
	let subtreeFlags = NoFlags;
	if (!didBailout) {
		// 合并fiber.lanes和fiber.childLanes
		// 合并fiber.flags和fiber.subtreeFlags
		while (child !== null) {
			newChildLanes = mergeLanes(newChildLanes, mergeLanes(child.childLanes, child.lanes));
			subtreeFlags = subtreeFlags | child.flags;
			subtreeFlags = subtreeFlags | child.subtreeFlags;

			child = child.sibling;
		}
		workInProgress.subtreeFlags = subtreeFlags;
		workInProgress.childLanes = newChildLanes;
	} else {
		// 没有改变
	}
}
export { completeWork };
