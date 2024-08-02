// @ts-ignore
import type { Fiber } from "react-reconciler/src/ReactInternalTypes";
// @ts-ignore
import { DefaultEventPriority } from "react-reconciler/src/ReactEventPriorities.ts";
import {
	DOMEventName,
	getEventPriority,
} from "../events/ReactDOMEventListener.ts";

export interface Container {
	internalContainerInstanceKey: Fiber;
}

function getCurrentEventPriority() {
	var currentEvent = window.event;

	if (currentEvent === undefined) {
		return DefaultEventPriority;
	}

	return getEventPriority(currentEvent.type as DOMEventName);
}

export { getCurrentEventPriority };
