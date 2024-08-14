// @ts-ignore
import type { Fiber } from "react-reconciler/src/ReactInternalTypes";
// @ts-ignore
import { DefaultEventPriority } from "react-reconciler/src/ReactEventPriorities.ts";
import { DOMEventName, getEventPriority } from "../events/ReactDOMEventListener.ts";

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

interface Props {
	autoFocus?: boolean;
	children?: any;
	disabled?: boolean;
	hidden?: boolean;
	suppressHydrationWarning?: boolean;
	style?: { display?: string; [key: string]: any };
	bottom?: null | number;
	left?: null | number;
	right?: null | number;
	top?: null | number;
	[key: string]: any;
}

export { getCurrentEventPriority };
export type { Props };
