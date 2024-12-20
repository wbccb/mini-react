import { Fiber } from "./ReactInternalTypes";
import { Lanes } from "./ReactFiberLane";
import { getIteratorFn, REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, ReactElement } from "shared";
import { createFiberFromElement, createFiberFromText } from "./ReactFiber";
import { Forked, Placement } from "./ReactFiberFlags";

function ChildReconciler(shouldTrackSideEffects: boolean) {
	function reconcileSingleElement(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: ReactElement,
		lanes: Lanes,
	): Fiber {
		if (newChild.type === REACT_FRAGMENT_TYPE) {
			return {} as Fiber;
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
	function createChild(parentFiber: Fiber, fiber: any, lanes: Lanes) {
		// 注：React源码中fiber就是any，因为createFiberFromElement是ReactElement类型
		if ((typeof fiber === "string" && fiber !== "") || typeof fiber === "number") {
			// <>纯文本</>
			const created = createFiberFromText("" + fiber, parentFiber.mode, lanes);

			created.return = parentFiber;
			return created;
		}
		if (typeof fiber === "object" && fiber !== null) {
			// <span>HostComponent</span>
			switch (fiber.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					const _created = createFiberFromElement(fiber, parentFiber.mode, lanes);
					_created.return = parentFiber;
					return _created;
				}
			}
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

	function reconcileSingleTextNode(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		text: string,
		lanes: Lanes,
	) {
		// TODO 暂时省略更新相关逻辑deleteRemainingChildren()
		// child不是数组 & child等于纯文本时触发
		const created = createFiberFromText(text, parentFiber.mode, lanes);
		created.return = parentFiber;
		return created;
	}

	function reconcileChildFibers(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: any,
		lanes: Lanes,
	): Fiber | null {
		let isUnkeyedTopLevelFragment =
			typeof newChild === "object" &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null;
		if (isUnkeyedTopLevelFragment) {
			newChild = newChild.props.children;
		}

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

		if ((typeof newChild === "string" && newChild !== "") || typeof newChild === "number") {
			return placeSingleChild(
				reconcileSingleTextNode(parentFiber, oldFiberFirstChild, "" + newChild, lanes),
			);
		}

		const childString = Object.prototype.toString.call(newChild);
		// throw new Error(
		// 	`Objects are not valid as a React child (found: ${
		// 		childString === "[object Object]"
		// 			? "object with keys {" + Object.keys(newChild).join(", ") + "}"
		// 			: childString
		// 	}). ` +
		// 		"If you meant to render a collection of children, use an array " +
		// 		"instead.",
		// );
		return null;
	}

	return reconcileChildFibers;
}

const reconcileChildFibers = ChildReconciler(true);
const mountChildFibers = ChildReconciler(false);

export { reconcileChildFibers, mountChildFibers };
