import { Fiber } from "react-reconciler";
import { Container, Instance, Props } from "./ReactDOMHostConfig";

const randomKey = Math.random().toString(36).slice(2);
const internalInstanceKey = "__reactFiber$" + randomKey;
const internalPropsKey = "__reactProps$" + randomKey;
const internalContainerInstanceKey = "__reactContainer$" + randomKey;
const internalEventHandlersKey = "__reactEvents$" + randomKey;
const internalEventHandlerListenersKey = "__reactListeners$" + randomKey;
const internalEventHandlesSetKey = "__reactHandles$" + randomKey;

export function precacheFiberNode(fiber: Fiber, node: any) {
	node[internalInstanceKey] = fiber;
}

export function markContainerAsRoot(hostRoot: Fiber, node: any): void {
	node[internalContainerInstanceKey] = hostRoot;
}

export function getClosestInstanceFromNode(targetNode: Node) {
	// 通过DOM -> Fiber
	let targetInst = (targetNode as any)[internalInstanceKey] as Fiber | undefined;
	if (targetInst) return targetInst;

	// 如果不存在，则向上寻找
	let parentNode = targetNode.parentNode;
	while (parentNode) {
		// 有可能是root：internalContainerInstanceKey
		// @ts-ignore
		targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey];
		if (targetInst) {
			return targetInst;
		}

		targetNode = parentNode;
		parentNode = targetNode.parentNode;
	}
	return null;
}

export function getFiberCurrentPropsFromNode(node: Instance): Props {
	return (node as any)[internalPropsKey] || null;
}

export function updateFiberProps(node: Instance, props: Props): void {
	(node as any)[internalPropsKey] = props;
}
