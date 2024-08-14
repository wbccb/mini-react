import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";
import { getIteratorFn, REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, ReactElement } from "shared";
import { createFiberFromElement, createFiberFromText } from "./ReactFiber.ts";
import { Forked, Placement } from "./ReactFiberFlags.ts";

function ChildReconciler(shouldTrackSideEffects: boolean) {
	function reconcileSingleElement(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: ReactElement,
		lanes: Lanes,
	): Fiber {
		if (newChild.type === REACT_FRAGMENT_TYPE) {
		} else {
			const newFiber: Fiber = createFiberFromElement(newChild, parentFiber.mode, lanes);
			newFiber.return = parentFiber;
			return newFiber;
		}
	}

	function placeSingleChild(newFiber: Fiber): Fiber {
		if (shouldTrackSideEffects && newFiber.alternate === null) {
			newFiber.flags |= Placement;
		}
		return newFiber;
	}

	function reconcileChildrenArray(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: any,
		lanes: Lanes,
	): Fiber | null {
		const oldFiber = oldFiberFirstChild;
		let newIdx = 0;
		let lastPlaceIndex = 0;
		let previousNewFiber: Fiber | null = null;
		let resultingFirstFiber: Fiber | null = null;

		if (oldFiber === null) {
			for (; newIdx < newChild.length; newIdx++) {
				const _newFiber: Fiber | null = createChild(parentFiber, newChild[newIdx], lanes);
				if (_newFiber === null) {
					continue;
				}
				lastPlaceIndex = placeChild(_newFiber, lastPlaceIndex, newIdx);
				if (previousNewFiber === null) {
					// 为了避免_newFiber为空的情况
					resultingFirstFiber = _newFiber;
				} else {
					previousNewFiber.sibling = _newFiber;
				}
				previousNewFiber = _newFiber;
			}
			return resultingFirstFiber;
		}

		return null;
	}
	function createChild(parentFiber: Fiber, fiber: Fiber, lanes: Lanes) {
		if ((typeof fiber === "string" && fiber !== "") || typeof fiber === "number") {
			const created = createFiberFromText("" + fiber, parentFiber.mode, lanes);

			created.return = parentFiber;
			return created;
		}
		return null;
	}
	function placeChild(newFiber: Fiber, lastPlaceIndex: number, newIndex: number): number {
		newFiber.index = newIndex;
		if (!shouldTrackSideEffects) {
			newFiber.flags |= Forked;
			return lastPlaceIndex;
		}
		// shouldTrackSideEffects=true: 对比或者HostRoot的第一层
		const current = newFiber.alternate;
		if (current !== null) {
			// TODO 后续diff再完善
			return current.index;
		} else {
			newFiber.flags |= Placement;
			return lastPlaceIndex;
		}
	}

	function reconcileChildFibers(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: any,
		lanes: Lanes,
	): Fiber | null {
		if (typeof newChild === "object" && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					const newFiber = reconcileSingleElement(parentFiber, oldFiberFirstChild, newChild, lanes);
					const flagsNewFiber = placeSingleChild(newFiber);
					return flagsNewFiber;
				}
			}

			if (Array.isArray(newChild) || getIteratorFn(newChild)) {
				// 数组或者可迭代对象
				return reconcileChildrenArray(parentFiber, oldFiberFirstChild, newChild, lanes);
			}
		}

		const childString = Object.prototype.toString.call(newChild);
		throw new Error(
			`Objects are not valid as a React child (found: ${
				childString === "[object Object]"
					? "object with keys {" + Object.keys(newChild).join(", ") + "}"
					: childString
			}). ` +
				"If you meant to render a collection of children, use an array " +
				"instead.",
		);
	}

	return reconcileChildFibers;
}

const reconcileChildFibers = ChildReconciler(true);
const mountChildFibers = ChildReconciler(false);

export { reconcileChildFibers, mountChildFibers };
