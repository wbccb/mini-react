import type { Fiber, FiberRoot } from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler";
import { DOMEventName, getEventPriority } from "../events/ReactDOMEventListener";
import { COMMENT_NODE } from "../shared/HTMLNodeType";

export type Instance = Element;

export type Container =
	| (Element & { _reactRootContainer?: FiberRoot })
	| (Document & { _reactRootContainer?: FiberRoot })
	| (DocumentFragment & { _reactRootContainer?: FiberRoot });

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

export function removeChild(parentInstance: Instance, child: Instance) {
	parentInstance.removeChild(child);
}

export function removeChildFromContainer(container: Container, child: Instance) {
	if (container.nodeType === COMMENT_NODE) {
		container.parentNode && container.parentNode.removeChild(child);
	} else {
		container.removeChild(child);
	}
}

export { getCurrentEventPriority };
export type { Props };
