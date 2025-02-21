import {
	ContinuousEventPriority,
	DefaultEventPriority,
	DiscreteEventPriority,
	getCurrentUpdatePriority,
	setCurrentUpdatePriority,
} from "react-reconciler";
import { DOMEventName } from "./DOMEventNames";
import { EventSystemFlags } from "./EventSystemFlags";
import { AnyNativeEvent } from "./PluginModuleType";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import { clearIfContinuousEvent } from "./ReactDOMEventReplaying";

export function getEventPriority(domEventName: DOMEventName) {
	switch (domEventName) {
		// Used by SimpleEventPlugin:
		case "cancel":
		case "click":
		case "close":
		case "contextmenu":
		case "copy":
		case "cut":
		case "auxclick":
		case "dblclick":
		case "dragend":
		case "dragstart":
		case "drop":
		case "focusin":
		case "focusout":
		case "input":
		case "invalid":
		case "keydown":
		case "keypress":
		case "keyup":
		case "mousedown":
		case "mouseup":
		case "paste":
		case "pause":
		case "play":
		case "pointercancel":
		case "pointerdown":
		case "pointerup":
		case "ratechange":
		case "reset":
		case "resize":
		case "seeked":
		case "submit":
		case "touchcancel":
		case "touchend":
		case "touchstart":
		case "volumechange":
		// Used by polyfills:
		// eslint-disable-next-line no-fallthrough
		case "change":
		case "selectionchange":
		case "textInput":
		case "compositionstart":
		case "compositionend":
		case "compositionupdate":
		// Only enableCreateEventHandleAPI:
		// eslint-disable-next-line no-fallthrough
		case "beforeblur":
		case "afterblur":
		// Not used by React but could be by user code:
		// eslint-disable-next-line no-fallthrough
		case "beforeinput":
		case "blur":
		case "fullscreenchange":
		case "focus":
		case "hashchange":
		case "popstate":
		case "select":
		case "selectstart":
			return DiscreteEventPriority;
		case "drag":
		case "dragenter":
		case "dragexit":
		case "dragleave":
		case "dragover":
		case "mousemove":
		case "mouseout":
		case "mouseover":
		case "pointermove":
		case "pointerout":
		case "pointerover":
		case "scroll":
		case "toggle":
		case "touchmove":
		case "wheel":
		// Not used by React but could be by user code:
		// eslint-disable-next-line no-fallthrough
		case "mouseenter":
		case "mouseleave":
		case "pointerenter":
		case "pointerleave":
			return ContinuousEventPriority;
		case "message": {
			// TODO 涉及到Scheduler
			return DefaultEventPriority;
		}
		default:
			return DefaultEventPriority;
	}
}

export function createEventListenerWrapperWithPriority(
	targetContainer: EventTarget,
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
) {
	let eventPriority = getEventPriority(domEventName);
	var listenerWrapper;

	switch (eventPriority) {
		case DiscreteEventPriority:
			listenerWrapper = dispatchDiscreteEvent;
			break;

		case ContinuousEventPriority:
			listenerWrapper = dispatchContinuousEvent;
			break;

		case DefaultEventPriority:
		default:
			listenerWrapper = dispatchEvent;
			break;
	}

	return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
}

function dispatchDiscreteEvent(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	container: EventTarget,
	nativeEvent: any,
) {
	var previousPriority = getCurrentUpdatePriority();
	try {
		setCurrentUpdatePriority(DiscreteEventPriority);
		dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
	} finally {
		setCurrentUpdatePriority(previousPriority);
	}
}
function dispatchContinuousEvent(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	container: EventTarget,
	nativeEvent: AnyNativeEvent,
) {
	var previousPriority = getCurrentUpdatePriority();
	try {
		setCurrentUpdatePriority(ContinuousEventPriority);
		dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
	} finally {
		setCurrentUpdatePriority(previousPriority);
	}
}
export function dispatchEvent(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
	nativeEvent: AnyNativeEvent,
): void {
	dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay(
		domEventName,
		eventSystemFlags,
		targetContainer,
		nativeEvent,
	);
}

export let return_targetInst = null;
function dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
	nativeEvent: AnyNativeEvent,
) {
	const blockedOn = findInstanceBlockingEvent(
		domEventName,
		eventSystemFlags,
		targetContainer,
		nativeEvent,
	);

	if (blockedOn === null) {
		dispatchEventForPluginEventSystem(
			domEventName,
			eventSystemFlags,
			nativeEvent,
			return_targetInst,
			targetContainer,
		);
		clearIfContinuousEvent(domEventName, nativeEvent);
		return;
	}
}

export function findInstanceBlockingEvent(
	domEventName: DOMEventName,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
	nativeEvent: AnyNativeEvent,
) {}
