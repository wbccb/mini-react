import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";
import {
	BeforeMutationMask,
	Hydrating,
	LayoutMask,
	MutationMask,
	NoFlags,
	Placement,
	Snapshot,
	Update,
} from "./ReactFiberFlags.ts";
import { HostComponent, HostPortal, HostRoot, HostText } from "./ReactWorkTags.ts";
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
	// TODO 后续完善
	var parentFiber: Fiber = getHostParentFiber(finishedWork);
	switch (parentFiber.tag) {
		case HostRoot:
			const _parent: Element = parentFiber.stateNode.containerInfo; // 根Fiber的DOM存放比较特殊
			const _before = getHostSibling(finishedWork);
			insertOrAppendPlacementNodeIntoContainer(finishedWork, _before, _parent);
			break;
	}
}

function getHostParentFiber(current: Fiber) {
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

function getHostSibling(fiber: Fiber) {}

function insertOrAppendPlacementNodeIntoContainer(node: Fiber, before: any, parent: any): void {
	const isHost = node.tag === HostComponent || node.tag === HostText;
	if (isHost) {
		if (before) {
			// TODO 插入到before位置前面
		} else {
			// TODO appendChild插入到最后的位置
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
