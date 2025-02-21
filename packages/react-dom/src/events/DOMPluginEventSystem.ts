import { allNativeEvents } from "./EventRegistry";
import { DOMEventName } from "./DOMEventNames";
import { DOCUMENT_NODE } from "../shared/HTMLNodeType";
import type { KnownReactSyntheticEvent, ReactSyntheticEvent } from "./ReactSyntheticEventType";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { Fiber } from "react-reconciler";
import { EventSystemFlags, IS_CAPTURE_PHASE } from "./EventSystemFlags";

type DispatchListener = {
	instance: null | Fiber;
	listener: Function;
	currentTarget: EventTarget;
};
type DispatchEntry = {
	event: ReactSyntheticEvent;
	listeners: Array<DispatchListener>;
};

export type DispatchQueue = Array<DispatchEntry>;

SimpleEventPlugin.registerEvents();

let listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
export const mediaEventTypes: Array<DOMEventName> = [
	"abort",
	"canplay",
	"canplaythrough",
	"durationchange",
	"emptied",
	"encrypted",
	"ended",
	"error",
	"loadeddata",
	"loadedmetadata",
	"loadstart",
	"pause",
	"play",
	"playing",
	"progress",
	"ratechange",
	"resize",
	"seeked",
	"seeking",
	"stalled",
	"suspend",
	"timeupdate",
	"volumechange",
	"waiting",
];
// @ts-ignore
export const nonDelegatedEvents: Set<DOMEventName> = new Set([
	"cancel",
	"close",
	"invalid",
	"load",
	"scroll",
	"toggle",
	...mediaEventTypes,
]);

export function listenToNativeEvent(
	domEventName: DOMEventName,
	isCapturePhaseListener: boolean,
	target: EventTarget,
) {
	var eventSystemFlags = 0;
	if (isCapturePhaseListener) {
		eventSystemFlags |= IS_CAPTURE_PHASE;
	}
	addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
}

function addTrappedEventListener(
	targetContainer: EventTarget,
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	isCapturePhaseListener: boolean,
	isDeferredListenerForLegacyFBSupport?: boolean,
) {}

/**
 * #root派发事件到对应的fiber
 * @param rootContainerElement
 */
function listenToAllSupportedEvents(rootContainerElement: EventTarget) {
	// 设置原始的监听方法
	console.log("listenToAllSupportedEvents", rootContainerElement);
	// @ts-expect-error 源码就是这样设置的
	if (rootContainerElement[listeningMarker]) {
		return;
	}
	// @ts-expect-error
	rootContainerElement[listeningMarker] = true;

	// 注册所有的原生事件到当前#root容器中
	allNativeEvents.forEach((domEventName) => {
		if (domEventName !== "selectionchange") {
			// 非委托事件
			if (!nonDelegatedEvents.has(domEventName)) {
				listenToNativeEvent(domEventName, false, rootContainerElement);
			}
			listenToNativeEvent(domEventName, true, rootContainerElement);
		}
	});

	const ownerDocument =
		(rootContainerElement as any).nodeType === DOCUMENT_NODE
			? rootContainerElement
			: (rootContainerElement as any).ownerDocument;

	if (ownerDocument !== null) {
		if (!(ownerDocument as any)[listeningMarker]) {
			(ownerDocument as any)[listeningMarker] = true;
			listenToNativeEvent("selectionchange", false, ownerDocument);
		}
	}
}

export { listenToAllSupportedEvents };
