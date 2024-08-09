import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";

/**
 * 1. 对当前workInProgress进行beginWork()处理（reconcileChildren子节点，返回第一个子节点）
 * 2. 返回workInProgress.child子节点
 */
function beginWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber {}

export { beginWork };
