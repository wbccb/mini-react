import { Fiber } from "./ReactInternalTypes";
import { Lanes } from "./ReactFiberLane";
import { getIteratorFn, REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE, ReactElement } from "shared";
import {
	createFiberFromElement,
	createFiberFromFragments,
	createFiberFromText,
	createWorkInProgress,
} from "./ReactFiber";
import { ChildDeletion, Forked, Placement } from "./ReactFiberFlags";
import { Fragment, HostText } from "./ReactWorkTags";

function ChildReconciler(shouldTrackSideEffects: boolean) {
	function deleteChild(parentFiber: Fiber, childFiber: Fiber) {
		if (!shouldTrackSideEffects) {
			// 初次渲染
			return;
		}

		const deletions = parentFiber.deletions;
		if (deletions === null) {
			parentFiber.deletions = [childFiber];
			parentFiber.flags = parentFiber.flags | ChildDeletion;
		} else {
			deletions.push(childFiber);
		}
	}
	function deleteRemainingChildren(parentFiber: Fiber, childFiber: Fiber | null) {
		if (!shouldTrackSideEffects) {
			// 初次渲染
			return null;
		}
		let deleteFiber = childFiber;
		while (deleteFiber !== null) {
			deleteChild(parentFiber, deleteFiber);
			deleteFiber = deleteFiber.sibling;
		}

		return null;
	}

	function useFiber(fiber: Fiber, pendingProps: Record<string, any> | string): Fiber {
		const clone = createWorkInProgress(fiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		return clone;
	}
	function reconcileSingleElement(
		parentFiber: Fiber,
		oldFiberFirstChild: Fiber | null,
		newChild: ReactElement,
		lanes: Lanes,
	): Fiber {
		// 新的newChild是一个元素，不是数组
		// 旧的oldFiberFirstChild可能是一个数组，也可能是一个元素
		let oldChild = oldFiberFirstChild;
		while (oldChild !== null) {
			// 根据key找到原来的元素
			if (oldChild.key !== newChild.key) {
				// 删除旧的元素
				deleteChild(parentFiber, oldChild);
			} else {
				// 先处理type等于REACT_FRAGMENT_TYPE的特殊结构，因为我们需要拿到props.children作为元素去继承
				if (newChild.type === REACT_FRAGMENT_TYPE) {
					if (oldChild.tag === Fragment) {
						// 如果两个type相同，则进行复用，跟下面的逻辑一致

						deleteRemainingChildren(parentFiber, oldChild.sibling);

						const newFiber = useFiber(oldChild, newChild.props.children);
						newFiber.return = parentFiber;
						return newFiber;
					}
				} else {
					if (newChild.type === oldChild.type) {
						// 由于这里直接return，因此需要删除其余元素
						deleteRemainingChildren(parentFiber, oldChild.sibling);

						// 直接复用旧的元素，进行数据更新

						const newFiber = useFiber(oldChild, newChild.props);
						newFiber.return = parentFiber;
						return newFiber;
					}
				}

				// 既然key相同，那么这个元素就是新旧元素，其余元素可以直接删除
				deleteRemainingChildren(parentFiber, oldChild);
				break;
			}

			oldChild = oldChild.sibling;
		}

		// 如果没有找到可以复用的元素，则直接创建一个新的fiebr元素
		const newFiber = createFiberFromElement(newChild, parentFiber.mode, lanes);
		newFiber.return = parentFiber;
		return newFiber;
	}

	function placeSingleChild(newFiber: Fiber): Fiber {
		if (shouldTrackSideEffects && newFiber.alternate === null) {
			newFiber.flags |= Placement;
		}
		return newFiber;
	}

	// 检测 oldFiber能否复用，如果能，则返回更新后的数据
	// 如果不能复用，则返回null
	function updateSlot(parentFiber: Fiber, oldFiber: Fiber, newChild: any, lanes: Lanes) {
		// 判断类型，进入不同的类型处理
		// 先通过key把明显不能复用的直接返回null
		// 不明显再进入不同的处理函数updateTextNode()...根据tag以及其他条件判断能否复用：能复用就更新；不能复用就新建

		const key = oldFiber !== null ? oldFiber.key : null;
		// 1.文本能否复用
		if ((typeof newChild === "string" && newChild !== "") || typeof newChild === "number") {
			if (key !== null) {
				// 有key必定不是文本节点无法复用
				return null;
			}
			return updateTextNode(parentFiber, oldFiber, "" + newChild, lanes);
		}
		// 2. 元素能否复用
		if (typeof newChild === "object" && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE: {
					if (newChild.key === key) {
						// 可以复用
						return updateElement(parentFiber, oldFiber, newChild, lanes);
					} else {
						return null;
					}
				}
			}

			// 数组能否复用
			if (Array.isArray(newChild) || getIteratorFn(newChild)) {
				if (key !== null) {
					// 数组也没有key
					return null;
				}
				return updateFragment(parentFiber, oldFiber, newChild, lanes, null);
			}
		}

		return null;
	}

	function updateTextNode(parentFiber: Fiber, oldFiber: Fiber, text: string, lanes: Lanes) {
		if (oldFiber === null || oldFiber.tag !== HostText) {
			const created = createFiberFromText(text, parentFiber.mode, lanes);
			created.return = parentFiber;
			return created;
		} else {
			const existing = useFiber(oldFiber, text);
			existing.return = parentFiber;
			return existing;
		}
	}

	function updateElement(
		parentFiber: Fiber,
		oldFiber: Fiber,
		newFiberElement: ReactElement,
		lanes: Lanes,
	) {
		const elementType = newFiberElement.type;

		if (elementType === REACT_FRAGMENT_TYPE) {
			// 先特殊处理fragment的情况
			return updateFragment(
				parentFiber,
				oldFiber,
				newFiberElement.props.children,
				lanes,
				newFiberElement.key,
			);
		}

		if (oldFiber !== null) {
			if (oldFiber.elementType === elementType) {
				const existing = useFiber(oldFiber, newFiberElement.props);
				existing.return = parentFiber;
				return existing;
			}
		}
		const created = createFiberFromElement(newFiberElement, parentFiber.mode, lanes);
		created.return = parentFiber;
		return created;
	}

	function updateFragment(
		parentFiber: Fiber,
		oldFiber: Fiber,
		fragment: ReactElement[],
		lanes: Lanes,
		key: string,
	) {
		if (oldFiber === null || oldFiber.tag !== Fragment) {
			const created = createFiberFromFragments(fragment, parentFiber.mode, lanes, key);
			created.return = parentFiber;
			return created;
		} else {
			const existing = useFiber(oldFiber, fragment);
			existing.return = parentFiber;
			return existing;
		}
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
		}

		return resultingFirstFiber;
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
