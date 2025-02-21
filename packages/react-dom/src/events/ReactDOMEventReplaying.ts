import { DOMEventName } from "./DOMEventNames";
import { AnyNativeEvent } from "./PluginModuleType";
import { EventSystemFlags } from "./EventSystemFlags";

type QueuedReplayableEvent = {
	blockedOn: null;
	domEventName: DOMEventName;
	eventSystemFlags: EventSystemFlags;
	nativeEvent: AnyNativeEvent;
	targetContainers: Array<EventTarget>;
};

let queuedFocus: null | QueuedReplayableEvent = null;
let queuedDrag: null | QueuedReplayableEvent = null;
let queuedMouse: null | QueuedReplayableEvent = null;

const queuedPointers: Map<number, QueuedReplayableEvent> = new Map();
const queuedPointerCaptures: Map<number, QueuedReplayableEvent> = new Map();

export function clearIfContinuousEvent(domEventName: DOMEventName, nativeEvent: AnyNativeEvent) {
	switch (domEventName) {
		case "focusin":
		case "focusout":
			queuedFocus = null;
			break;

		case "dragenter":
		case "dragleave":
			queuedDrag = null;
			break;

		case "mouseover":
		case "mouseout":
			queuedMouse = null;
			break;

		case "pointerover":
		case "pointerout": {
			var pointerId = (nativeEvent as any).pointerId;
			queuedPointers.delete(pointerId);
			break;
		}

		case "gotpointercapture":
		case "lostpointercapture": {
			var _pointerId = (nativeEvent as any).pointerId;
			queuedPointerCaptures.delete(_pointerId);
			break;
		}
	}
}
