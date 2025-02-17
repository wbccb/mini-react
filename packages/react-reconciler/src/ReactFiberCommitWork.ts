import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { Lanes } from "./ReactFiberLane";
import {
	BeforeMutationMask,
	ChildDeletion,
	Hydrating,
	LayoutMask,
	MutationMask,
	NoFlags,
	Passive,
	PassiveMask,
	Placement,
	Ref,
	Snapshot,
	Update,
} from "./ReactFiberFlags";
import {
	ClassComponent,
	DehydratedFragment,
	FunctionComponent,
	HostComponent,
	HostPortal,
	HostRoot,
	HostText,
} from "./ReactWorkTags";
import {
	Instance,
	removeChild,
	removeChildFromContainer,
} from "react-dom/src/client/ReactDOMHostConfig";
import { FiberNode } from "./ReactFiber";
import { updateDOMProperties } from "react-dom/src/client/ReactDOMComponent";
import { HookFlags, HookHasEffect, HookPassive } from "./ReactHookEffectTags";
import { FunctionComponentUpdateQueue } from "./ReactFiberHooks";

let nextEffect: Fiber | null = null;

function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber) {
	// before Mutation真正执行地方
	const flags = finishedWork.flags;
	if ((flags & Snapshot) === NoFlags) {
		return;
	}

	switch (finishedWork.tag) {
		case HostComponent:
			break;
		case HostRoot:
			const root = finishedWork.stateNode;
			root.textContent = "";
			break;
	}
}

function commitMutationEffectsOnFiber(finishedWork: Fiber, root: FiberRoot) {
	// MutationEffects真正执行地方
	const flags = finishedWork.flags;
	const current = finishedWork.alternate;
	switch (finishedWork.tag) {
		case FunctionComponent:
		case HostRoot:
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			if (flags & Update) {
				// TODO 待完善useEffect和useLayoutEffect的相关逻辑
			}
			return;
		case HostComponent:
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			if (flags & Ref) {
			}
			if (flags & Update) {
				const instance = finishedWork.stateNode;
				if (instance !== null) {
					const newProps = finishedWork.memoizedProps;
					const oldProps = current?.memoizedProps || newProps;
					const type = finishedWork.type;
					const updatePayload = finishedWork.updateQueue;
					finishedWork.updateQueue = null;
					if (updatePayload !== null) {
						commitUpdate(instance, updatePayload);
					}
				}
			}
			return;
		case HostText: {
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			if (flags & Update) {
				const textInstance = finishedWork.stateNode;
				const newText = finishedWork.memoizedProps;
				textInstance.nodeValue = newText;
			}
			return;
		}
		default: {
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			return;
		}
	}
}

function commitLayoutEffectOnFiber(
	finishedRoot: FiberRoot,
	current: Fiber | null,
	finishedWork: Fiber,
	committedLanes: Lanes,
) {
	// LayoutEffects真正执行地方
}

function recursivelyTraverseMutationEffects(root: FiberRoot, parentFiber: Fiber) {
	var deletions = parentFiber.deletions;
	if (deletions !== null) {
		for (var i = 0; i < deletions.length; i++) {
			var childToDelete = deletions[i];
			commitDeletionEffects(root, parentFiber, childToDelete);
			// TODO 不用将fiber.ChildDeletion去掉？或者deletions置为空？？
		}
	}

	if (parentFiber.subtreeFlags & MutationMask) {
		let child = parentFiber.child;

		while (child !== null) {
			commitMutationEffectsOnFiber(child, root);
			child = child.sibling;
		}
	}
}

function commitReconciliationEffects(finishedWork: Fiber) {
	var flags = finishedWork.flags;
	if (flags & Placement) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if (flags & Hydrating) {
		finishedWork.flags &= ~Hydrating;
	}
}

let hostParent: Instance | null = null;
let hostParentIsContainer: boolean = false;

function commitDeletionEffects(root: FiberRoot, parentFiber: Fiber, deletedFiber: Fiber) {
	let parent: FiberNode | null = parentFiber;
	findParent: while (parent !== null) {
		switch (parent.tag) {
			case HostComponent: {
				hostParent = parent.stateNode;
				hostParentIsContainer = false;
				break findParent;
			}
			case HostRoot: {
				hostParent = parent.stateNode.containerInfo;
				hostParentIsContainer = true;
				break findParent;
			}
		}
		parent = parent.return;
	}

	commitDeletionEffectsOnFiber(root, parentFiber, deletedFiber);

	hostParent = null;
	hostParentIsContainer = false;

	// commitDeletionEffectsOnFiber()已经清除了DOM之间的关系，下面我们将清除fiber之间的关系
	detachFiberMutation(deletedFiber);
}

function detachFiberMutation(fiber: Fiber) {
	const alternate = fiber.alternate;
	if (alternate !== null) {
		alternate.return = null;
	}
	fiber.return = null;
}

function commitDeletionEffectsOnFiber(root: FiberRoot, parentFiber: Fiber, deletedFiber: Fiber) {
	// 如果当前类型是HostComponent，直接删除parentDom.removeChild(childDom)即可
	// 如果当前类型是FunctionComponent，我们需要触发对应的effect，然后拿到fiber.child(因为FunctionComponent这个fiber是不具备DOM的)才是它的DOM，甚至有可能这个fiber.child是一个数组，也就是多个DOM，我们需要遍历所有DOM进行removeChild()

	// 根据fiber.tag进行不同的处理方式，遇到HostComponent & HostText才启动删除工作
	switch (deletedFiber.tag) {
		// @ts-expect-error: 这里故意先执行HostComponent -> HostText
		case HostComponent: {
			safelyDetachRef(deletedFiber, parentFiber);
		}
		case HostText: {
			const prevHostParent = hostParent;
			const prevHostParentIsContainer = hostParentIsContainer;

			// react源码注释：我们只需要移除最近的宿主子节点。将宿主父节点，在堆栈上设置为 `null`，以指示嵌套子节点不需要被移除
			// TODO 暂时不是很懂什么场景，以后再补充注释
			hostParent = null;
			recursivelyTraverseDeletionEffects(root, parentFiber, deletedFiber);

			hostParent = prevHostParent;
			hostParentIsContainer = prevHostParentIsContainer;

			if (hostParent !== null) {
				if (hostParentIsContainer) {
					removeChildFromContainer(hostParent, deletedFiber.stateNode);
				} else {
					removeChild(hostParent, deletedFiber.stateNode);
				}
			}
			return;
		}
		case ClassComponent: {
			const instance = deletedFiber.stateNode;
			if (typeof instance.componentWillUnmount === "function") {
				instance.props = deletedFiber.memoizedProps;
				instance.state = deletedFiber.memoizedState;
				instance.componentWillUnmount();
			}

			recursivelyTraverseDeletionEffects(root, parentFiber, deletedFiber);
			return;
		}
		case FunctionComponent: {
			// TODO 处理Function中注册的useEffect集合，后续再完善

			recursivelyTraverseDeletionEffects(root, parentFiber, deletedFiber);
			return;
		}
		default:
			recursivelyTraverseDeletionEffects(root, parentFiber, deletedFiber);
			return;
	}
}

function safelyDetachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {}

function recursivelyTraverseDeletionEffects(
	root: FiberRoot,
	parentFiber: Fiber,
	deletedFiber: Fiber,
) {
	let child = deletedFiber.child;
	while (child !== null) {
		commitDeletionEffectsOnFiber(root, parentFiber, child);
		child = child.sibling;
	}
}

function commitUpdate(domElement: HTMLElement, updatePayload: any) {
	updateDOMProperties(domElement, updatePayload);
}

function commitPlacement(finishedWork: Fiber) {
	var parentFiber: Fiber = getHostParentFiber(finishedWork);
	//!!!!看清楚是parentFiber.tag，不是fiber.tag
	switch (parentFiber.tag) {
		case HostRoot:
			const _parent: Element = parentFiber.stateNode.containerInfo; // 根Fiber的DOM存放比较特殊
			const _before = getHostSibling(finishedWork);
			insertOrAppendPlacementNodeIntoContainer(finishedWork, _before, _parent);
			break;
		case HostComponent:
			const parent = parentFiber.stateNode;
			const before = getHostSibling(finishedWork);
			insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
			break;
	}
}

function getHostParentFiber(current: Fiber) {
	// 因为current.return可能是React.Fragment、FunctionComponent、ClassComponent等多种不具备DOM
	// 我们需要找到那个有真实DOM的parent
	let parent = current.return;
	while (parent !== null) {
		if (isHostParent(parent)) {
			return parent;
		}
		parent = parent.return;
	}
	throw new Error(
		"Expected to find a host parent. This error is likely caused by a bug " +
			"in React. Please file an issue.",
	);
}

function getHostSibling(fiber: Fiber) {
	// 我们会试着找当前`fiber`的`sibling`，此时的`<React.Fragment>`的`sibling`=`<p></p>`
	// 当然，如果`node.sibling`不存在，那么我们会试着往上再找一层，然后找它的`sibling`
	// 因为可能存在下面的情况，当我们的`fiber`=`<p>`时，它的`sibling`为空，我们只能找它的`return.sibling`

	// 返回null的情况：
	// 如果当前`fiber`的`sibling`为空，往上一层的`fiber`也为空
	// 如果当前`fiber`的`sibling`为空，往上一层`fiber`又具备`DOM`，并不是下面这种`<><p></p></>`，那我们也不能拿上一层`fiber`的`sibling`作为参照物去插入`DOM`！

	var node = fiber;

	siblings: while (true) {
		while (node.sibling === null) {
			if (node.return === null || isHostParent(node.return)) {
				return null;
			}
			// 如果没有node.sibling，并且node.return是一个不具备stateNode的，那么我们就试着找node.return.sibling
			node = node.return;
		}

		// 试着找node.sibling
		node.sibling.return = node.return;
		node = node.sibling;

		// 找到node.sibling: 如果node.sibling不具备DOM
		while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedFragment) {
			// 判断node.sibling.children能不能用？

			// 首先得满足不具备Placement标记
			if (node.flags && Placement) {
				// 不能继续往下找它的child，因为它自己本身都不稳定
				continue siblings;
			}
			// 如果node.child为空
			if (node.child === null || node.tag === HostPortal) {
				continue siblings;
			}
			// node.child满足题意，将当前node换成node.child
			node.child.return = node;
			node = node.child;
		}

		// 检查当前node是否Placement，如果有，则继续循环找nde.sibling
		if (!(node.flags && Placement)) {
			return node.stateNode;
		}
	}
}

function insertOrAppendPlacementNodeIntoContainer(node: Fiber, before: any, parent: any): void {
	const tag = node.tag;
	const isHost = tag === HostComponent || tag === HostText;
	if (isHost) {
		const stateNode = node.stateNode;
		// 本身fiber具备dom，可以执行dom.appendChild() 或者 dom.insertBefore()
		if (before) {
			parent.insertBefore(stateNode, before);
		} else {
			parent.appendChild(stateNode);
		}
	} else {
		// 如果本身不具备fiber，比如fiber=Fragment、fiber=ClassComponent、fiber=FunctionComponent
		// 那么我们需要向下寻找fiber.child看看它具备不具备DOM，然后关联起来
		// 关联完成后，还要关联fiber.child.sibling：因为你的fiber不具备DOM，因此dom.appendChild(fiber的所有children的DOM)
		// 比如<><div/><span/><div/></>，#root 就得把所有<div>都加入到#root.appendChild()中，因为<div>的parent是<></>

		let child = node.child;
		if (child !== null) {
			insertOrAppendPlacementNodeIntoContainer(child, before, parent);
			let sibling = child.sibling;
			while (sibling !== null) {
				insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
				sibling = child.sibling;
			}
		}
	}
}

function isHostParent(fiber: Fiber): boolean {
	return fiber.tag === HostComponent || fiber.tag === HostRoot || fiber.tag === HostPortal;
}

function commitBeforeMutationEffects(root: FiberRoot, firstChild: Fiber) {
	nextEffect = firstChild;
	commitBeforeMutationEffects_begin();
}

function commitBeforeMutationEffects_begin() {
	while (nextEffect !== null) {
		var fiber: Fiber = nextEffect;
		var child = fiber.child;
		if ((fiber.subtreeFlags & BeforeMutationMask) !== NoFlags && child !== null) {
			child.return = fiber;
			nextEffect = child;
		} else {
			commitBeforeMutationEffects_complete();
		}
	}
}

function commitBeforeMutationEffects_complete() {
	while (nextEffect !== null) {
		const fiber = nextEffect;
		commitBeforeMutationEffectsOnFiber(fiber);
		const sibling = fiber.sibling;

		if (sibling !== null) {
			sibling.return = fiber.return;
			nextEffect = sibling;
			return;
		}

		nextEffect = fiber.return;
	}
}

function commitMutationEffects(root: FiberRoot, finishedWork: Fiber, lanes: Lanes) {
	commitMutationEffectsOnFiber(finishedWork, root);
}

function commitLayoutEffects(finishedWork: Fiber, root: FiberRoot, committedLanes: Lanes) {
	nextEffect = finishedWork;
	commitLayoutEffects_begin(finishedWork, root, committedLanes);
}

function commitLayoutEffects_begin(subtreeRoot: Fiber, root: FiberRoot, committedLanes: Lanes) {
	while (nextEffect !== null) {
		var fiber = nextEffect;
		var firstChild = fiber.child;

		if ((fiber.subtreeFlags & LayoutMask) !== NoFlags && firstChild !== null) {
			firstChild.return = fiber;
			nextEffect = firstChild;
		} else {
			commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
		}
	}
}

function commitLayoutMountEffects_complete(
	subtreeRoot: Fiber,
	root: FiberRoot,
	committedLanes: Lanes,
) {
	while (nextEffect !== null) {
		var fiber = nextEffect;
		if ((fiber.flags & LayoutMask) !== NoFlags) {
			var current = fiber.alternate;
			commitLayoutEffectOnFiber(root, current, fiber, committedLanes);
		}
		if (fiber === subtreeRoot) {
			// commitLayoutEffects()>nextEffect=subtreeRoot，
			// 如果相等，则说明遍历到一开始的parent，已经全部都处理完毕了，因此是后序遍历，先处理children->parent
			nextEffect = null;
			return;
		}
		var sibling = fiber.sibling;
		if (sibling !== null) {
			sibling.return = fiber.return;
			nextEffect = sibling;
			return;
		}
		nextEffect = fiber.return;
	}
}

function commitPassiveUnmountEffects(firstChild: Fiber) {
	nextEffect = firstChild;
	// 深度遍历先执行当前fiber的commitHookEffectListUnmount(HookPassive)
	// 然后从children->parent执行fiber的commitHookEffectListUnmount(HookPassive | HookHasEffect)
	commitPassiveUnmountEffects_begin();
}

function commitPassiveUnmountEffects_begin() {
	while (nextEffect !== null) {
		let fiber = nextEffect;
		let child = fiber.child;

		// 要被删除的fiber的effect.destroy()的执行
		if ((nextEffect.flags & ChildDeletion) !== NoFlags) {
			const deletions = nextEffect.deletions;
			if (deletions !== null) {
				for (let i = 0; i < deletions.length; i++) {
					const deleteFiber = deletions[i];
					nextEffect = deleteFiber;
					commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deleteFiber, fiber);
				}
				nextEffect = fiber;
			}
		}

		if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
			child.return = fiber;
			nextEffect = child;
		} else {
			// 深度遍历：先执行最底层的fiber-清除上一个effect所触发的effect.destroy()
			commitPassiveUnmountEffects_complete();
		}
	}
}
function commitPassiveUnmountEffects_complete() {
	// 先执行child
	// 然后检测child.sibling是否为空，不为空则继续出发commitPassiveUnmountEffects_begin()
	while (nextEffect !== null) {
		const fiber = nextEffect;
		if ((fiber.flags & Passive) !== NoFlags) {
			switch (fiber.tag) {
				case FunctionComponent:
					commitHookEffectListUnmount(HookPassive | HookHasEffect, fiber, fiber.return!);
					break;
			}
		}

		const sibling = fiber.sibling;
		if (sibling !== null) {
			nextEffect = sibling;
			return; // 继续执行commitPassiveUnmountEffects_begin
		}

		nextEffect = fiber.return;
	}
}

function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
	deleteFiber: Fiber,
	parentFiber: Fiber,
) {
	while (nextEffect !== null) {
		// 先处理当前fiber
		var fiber = nextEffect;
		switch (fiber.tag) {
			case FunctionComponent:
				commitHookEffectListUnmount(HookPassive, deleteFiber, parentFiber);
				break;
		}
		// 深度遍历
		const child = fiber.child;
		if (child !== null) {
			child.return = fiber;
			nextEffect = child;
		} else {
			commitPassiveUnmountEffectsInsideOfDeletedTree_complete(deleteFiber);
		}
	}
}

function commitPassiveUnmountEffectsInsideOfDeletedTree_complete(deleteFiber: Fiber) {
	// TODO 进行fiber数据的清空...我觉得没啥用，暂时先不完善
}

function commitPassiveMountEffects(root: FiberRoot, finishedWork: Fiber, committedLanes: Lanes) {
	nextEffect = finishedWork;
	commitPassiveMountEffects_begin(finishedWork, root, committedLanes);
}

function commitPassiveMountEffects_begin(
	subtreeRoot: Fiber,
	root: FiberRoot,
	committedLanes: Lanes,
) {
	while (nextEffect !== null) {
		const fiber = nextEffect;
		const firstChild = fiber.child;
		if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && firstChild !== null) {
			firstChild.return = fiber;
			nextEffect = firstChild;
		} else {
			commitPassiveMountEffects_complete(subtreeRoot, root, committedLanes);
		}
	}
}
function commitPassiveMountEffects_complete(
	subtreeRoot: Fiber,
	root: FiberRoot,
	committedLanes: Lanes,
) {
	while (nextEffect !== null) {
		const fiber = nextEffect;
		if (fiber === subtreeRoot) {
			nextEffect = null;
			return;
		}

		// 深度遍历执行，从最底部节点开始向上parent执行，如果遇到sibling不是最底部，则继续向下遍历拿到最底部节点，然后再从最底部节点向上parent执行
		if ((fiber.flags & Passive) !== NoFlags) {
			switch (fiber.tag) {
				case HostComponent:
					commitHookEffectListMount(HookPassive | HookHasEffect, fiber);
					break;
			}
		}

		const sibling = fiber.sibling;
		if (sibling !== null) {
			sibling.return = fiber.return;
			nextEffect = sibling;
			return;
		}

		nextEffect = fiber.return;
	}
}
// 执行useEffect的destroy()方法
function commitHookEffectListUnmount(flags: HookFlags, fiber: Fiber, parentFiber: Fiber) {}

// 执行useEffect的create()方法
function commitHookEffectListMount(flags: HookFlags, fiber: Fiber) {}

export {
	commitBeforeMutationEffects,
	commitLayoutEffects,
	commitMutationEffects,
	commitPassiveUnmountEffects,
	commitPassiveMountEffects,
};
