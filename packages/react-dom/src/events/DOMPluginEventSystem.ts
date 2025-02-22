import { allNativeEvents } from "./EventRegistry";
import { DOMEventName } from "./DOMEventNames";
import { DOCUMENT_NODE } from "../shared/HTMLNodeType";
import type { KnownReactSyntheticEvent, ReactSyntheticEvent } from "./ReactSyntheticEventType";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";
import { Fiber } from "react-reconciler";
import { EventSystemFlags, IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import { addEventBubbleListener, addEventCaptureListener } from "./EventListener";
import { AnyNativeEvent } from "./PluginModuleType";
import getEventTarget from "./getEventTarget";

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
) {
	let listener = createEventListenerWrapperWithPriority(
		targetContainer,
		domEventName,
		eventSystemFlags,
	);
	if (isCapturePhaseListener) {
		addEventCaptureListener(targetContainer, domEventName, listener);
	} else {
		addEventBubbleListener(targetContainer, domEventName, listener);
	}
}

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

function dispatchEventForPluginEventSystem(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	nativeEvent: AnyNativeEvent,
	targetInst: null | Fiber,
	targetContainer: EventTarget,
): void {
	const ancestorInst = targetInst;
	// 省略检测当前 fiber (不断fiber=fiber.return)找到的HostRoot对应的DOM跟目前传入的targetContainerNode是否不同，不同则需要重新寻找

	// 开始正式派发事件
	dispatchEventsForPlugins(
		domEventName,
		eventSystemFlags,
		nativeEvent,
		ancestorInst,
		targetContainer,
	);
}

function dispatchEventsForPlugins(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	nativeEvent: AnyNativeEvent,
	targetInst: null | Fiber,
	targetContainer: EventTarget,
): void {
	const nativeEventTarget = getEventTarget(nativeEvent);
	const dispatchQueue: DispatchQueue = [];
	extractEvents(
		dispatchQueue,
		domEventName,
		targetInst,
		nativeEvent,
		nativeEventTarget,
		eventSystemFlags,
		targetContainer,
	);
	processDispatchQueue(dispatchQueue, eventSystemFlags);
}

function extractEvents(
	dispatchQueue: DispatchQueue,
	domEventName: DOMEventName,
	targetInst: null | Fiber,
	nativeEvent: AnyNativeEvent,
	nativeEventTarget: null | EventTarget,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
) {
	SimpleEventPlugin.extractEvents(
		dispatchQueue,
		domEventName,
		targetInst,
		nativeEvent,
		nativeEventTarget,
		eventSystemFlags,
		targetContainer,
	);

	//...省略好多 XXXPlugin.extractEvent()
}

export function processDispatchQueue(
	dispatchQueue: DispatchQueue,
	eventSystemFlags: EventSystemFlags,
): void {
	const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
	for (let i = 0; i < dispatchQueue.length; i++) {
		const {event, listeners} = dispatchQueue[i];
		processDispatchQueueItemsInOrder(event, listeners, inCapturePhase);
	}
}


function processDispatchQueueItemsInOrder(
	event: ReactSyntheticEvent,
	dispatchListeners: Array<DispatchListener>,
	inCapturePhase: boolean,
): void {
	let previousInstance;
	if (inCapturePhase) {
		for (let i = dispatchListeners.length - 1; i >= 0; i--) {
			const {instance, currentTarget, listener} = dispatchListeners[i];
			if (instance !== previousInstance && event.isPropagationStopped()) {
				return;
			}
			executeDispatch(event, listener, currentTarget);
			previousInstance = instance;
		}
	} else {
		for (let i = 0; i < dispatchListeners.length; i++) {
			const {instance, currentTarget, listener} = dispatchListeners[i];
			if (instance !== previousInstance && event.isPropagationStopped()) {
				return;
			}
			executeDispatch(event, listener, currentTarget);
			previousInstance = instance;
		}
	}
}

function executeDispatch(
	event: ReactSyntheticEvent,
	listener: Function,
	currentTarget: EventTarget,
): void {
	const type = event.type || 'unknown-event';
	event.currentTarget = currentTarget;
	// @ts-ignore
	listener.call(this, type, undefined, event);
	event.currentTarget = null;
}


export { listenToAllSupportedEvents, dispatchEventForPluginEventSystem };
