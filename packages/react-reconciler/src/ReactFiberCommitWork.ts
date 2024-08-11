import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";
import { BeforeMutationMask, LayoutMask, NoFlags, Snapshot } from "./ReactFiberFlags.ts";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags.ts";
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

	switch (finishedWork.tag) {
		case HostComponent:
		case HostRoot:
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
