import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, ReactElement } from "shared";
import { createFiberFromElement } from "./ReactFiber.ts";
import { Placement } from "./ReactFiberFlags.ts";

function ChildReconciler(shouldTrackSideEffects: boolean) {
	function reconcileSingleElement(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: ReactElement,
		lanes: Lanes,
	): Fiber {
		if (newChild.type === REACT_FRAGMENT_TYPE) {
		} else {
			const newFiber: Fiber = createFiberFromElement(
				newChild,
				parentFiber.mode,
				lanes,
			);
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

	function reconcileChildFibers(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: any,
		lanes: Lanes,
	): Fiber | null {
		if (typeof newChild === "object" && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					const newFiber = reconcileSingleElement(
						parentFiber,
						oldFiberFirstChild,
						newChild,
						lanes,
					);
					const flagsNewFiber = placeSingleChild(newFiber);
					return flagsNewFiber;
				}
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
