import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from "shared";
import type { ReactContext } from "shared";
import { Fiber, isSubsetOfLanes, Lanes, mergeLanes } from "react-reconciler";

export function createContext(defaultValue: any) {
	const context: ReactContext = {
		$$typeof: REACT_CONTEXT_TYPE,
		_currentValue: defaultValue,

		// @ts-ignore
		Provider: null,
		// @ts-ignore
		Consumer: null,

		_defaultValue: null,
	};

	context.Provider = {
		$$typeof: REACT_PROVIDER_TYPE,
		_context: context,
	};

	context.Consumer = context;

	return context;
}

/**
 * 处理fiber.childrenLanes相关向上传播的逻辑
 * @param parentFiber
 * @param renderLanes
 * @param localRoot
 */
export function scheduleContextWorkOnParentPath(
	parentFiber: Fiber | null,
	renderLanes: Lanes,
	localRoot: Fiber,
) {
	let node: Fiber | null = parentFiber;
	while (node) {
		const alternate = node.alternate;

		if (!isSubsetOfLanes(node.childLanes, renderLanes)) {
			node.childLanes = mergeLanes(node.childLanes, renderLanes);
			if (alternate !== null) {
				alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
			}
		} else if (alternate !== null && !isSubsetOfLanes(alternate.childLanes, renderLanes)) {
			alternate.childLanes = mergeLanes(alternate.childLanes, renderLanes);
		}

		if (node === localRoot) {
			break;
		}
		node = node.return;
	}
}
