import {
	ContinuousEventPriority,
	DefaultEventPriority,
	DiscreteEventPriority,
	// @ts-ignore
} from "react-reconciler/src/ReactEventPriorities";

export type DOMEventName =
	| "abort"
	| "afterblur" // Not a real event. This is used by event experiments.
	// These are vendor-prefixed so you should use the exported constants instead:
	// 'animationiteration' |
	// 'animationend |
	// 'animationstart' |
	| "beforeblur" // Not a real event. This is used by event experiments.
	| "beforeinput"
	| "blur"
	| "canplay"
	| "canplaythrough"
	| "cancel"
	| "change"
	| "click"
	| "close"
	| "compositionend"
	| "compositionstart"
	| "compositionupdate"
	| "contextmenu"
	| "copy"
	| "cut"
	| "dblclick"
	| "auxclick"
	| "drag"
	| "dragend"
	| "dragenter"
	| "dragexit"
	| "dragleave"
	| "dragover"
	| "dragstart"
	| "drop"
	| "durationchange"
	| "emptied"
	| "encrypted"
	| "ended"
	| "error"
	| "focus"
	| "focusin"
	| "focusout"
	| "fullscreenchange"
	| "gotpointercapture"
	| "hashchange"
	| "input"
	| "invalid"
	| "keydown"
	| "keypress"
	| "keyup"
	| "load"
	| "loadstart"
	| "loadeddata"
	| "loadedmetadata"
	| "lostpointercapture"
	| "message"
	| "mousedown"
	| "mouseenter"
	| "mouseleave"
	| "mousemove"
	| "mouseout"
	| "mouseover"
	| "mouseup"
	| "paste"
	| "pause"
	| "play"
	| "playing"
	| "pointercancel"
	| "pointerdown"
	| "pointerenter"
	| "pointerleave"
	| "pointermove"
	| "pointerout"
	| "pointerover"
	| "pointerup"
	| "popstate"
	| "progress"
	| "ratechange"
	| "reset"
	| "resize"
	| "scroll"
	| "seeked"
	| "seeking"
	| "select"
	| "selectstart"
	| "selectionchange"
	| "stalled"
	| "submit"
	| "suspend"
	| "textInput" // Intentionally camelCase. Non-standard.
	| "timeupdate"
	| "toggle"
	| "touchcancel"
	| "touchend"
	| "touchmove"
	| "touchstart"
	// These are vendor-prefixed so you should use the exported constants instead:
	// 'transitionend' |
	| "volumechange"
	| "waiting"
	| "wheel";

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
