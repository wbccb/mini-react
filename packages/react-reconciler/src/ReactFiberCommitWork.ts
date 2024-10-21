import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { Lanes } from "./ReactFiberLane";
import {
	BeforeMutationMask,
	Hydrating,
	LayoutMask,
	MutationMask,
	NoFlags,
	Placement,
	Ref,
	Snapshot,
	Update,
} from "./ReactFiberFlags";
import { DehydratedFragment, HostComponent, HostPortal, HostRoot, HostText } from "./ReactWorkTags";

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
	switch (finishedWork.tag) {
		case HostRoot:
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			if (flags & Update) {
				// TODO 渲染更新再完善
			}
			return;
		case HostComponent:
			recursivelyTraverseMutationEffects(root, finishedWork);
			commitReconciliationEffects(finishedWork);
			if (flags & Ref) {
			}
			if (flags & Update) {
				// TODO 渲染更新再完善
			}
			return;
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

function commitDeletionEffects(root: FiberRoot, parentFiber: Fiber, deleteFiber: Fiber) {
	// TODO 后续完善
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
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;

		// 找到node.sibling: 我们得判断是不是isHost(node.sibling) && 不具备Placement标记
		while (node.tag !== HostComponent && node.tag !== HostText && node.tag !== DehydratedFragment) {
			if (node.flags && Placement) {
				// 不能继续往下找它的child，因为它自己本身都不稳定
				continue siblings;
			}
			if (node.child === null || node.tag === HostPortal) {
				continue siblings;
			}

			node.child.return = node;
			node = node.child;
		}

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

export { commitBeforeMutationEffects, commitLayoutEffects, commitMutationEffects };
