import { DOMEventName } from "../DOMEventNames";
import { Fiber } from "react-reconciler";
import type { DispatchQueue } from "../DOMPluginEventSystem";
import type { AnyNativeEvent, EventSystemFlags } from "../../events/PluginModuleType";
import { topLevelEventsToReactNames, registerSimpleEvents } from "../DOMEventProperties";
import {
	SyntheticClipboardEvent,
	SyntheticDragEvent,
	SyntheticEvent,
	SyntheticFocusEvent,
	SyntheticKeyboardEvent,
	SyntheticMouseEvent,
	SyntheticPointerEvent,
	SyntheticTouchEvent,
	SyntheticUIEvent,
	SyntheticWheelEvent,
} from "../SyntheticEvent";
import getEventCharCode from "../getEventCharCode";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags";
import { HostComponent } from "react-reconciler/src/ReactWorkTags";

function extractEvents(
	dispatchQueue: DispatchQueue,
	domEventName: DOMEventName,
	targetInst: null | Fiber,
	nativeEvent: AnyNativeEvent,
	nativeEventTarget: null | EventTarget,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
) {
	// 先从 topLevelEventsToReactNames 中利用原生的DOM事件名称获取React事件名称
	// 触发accumulateSinglePhaseListeners()传入 fiber + React事件名称（比如onClick），通过fiber.props上的属性，获取对应的监听方法
	// 创建合成事件对象_event = new SyntheticEventCtor()
	// 将合成事件对象 + fiber.props 获取到的回调函数数组加入到 dispatchQueue 中

	const reactName = topLevelEventsToReactNames[domEventName];
	if (!reactName) {
		return;
	}
	let SyntheticEventCtor = SyntheticEvent;
	let reactEventType: string = domEventName;
	switch (domEventName) {
		case "keypress":
			// Firefox creates a keypress event for function keys too. This removes
			// the unwanted keypress events. Enter is however both printable and
			// non-printable. One would expect Tab to be as well (but it isn't).
			if (getEventCharCode(nativeEvent as any as KeyboardEvent) === 0) {
				return;
			}
		/* falls through */
		case "keydown":
		case "keyup":
			SyntheticEventCtor = SyntheticKeyboardEvent;
			break;
		case "focusin":
			reactEventType = "focus";
			SyntheticEventCtor = SyntheticFocusEvent;
			break;
		case "focusout":
			reactEventType = "blur";
			SyntheticEventCtor = SyntheticFocusEvent;
			break;
		case "beforeblur":
		case "afterblur":
			SyntheticEventCtor = SyntheticFocusEvent;
			break;
		case "click":
			// Firefox creates a click event on right mouse clicks. This removes the
			// unwanted click events.
			// @ts-ignore
			if (nativeEvent.button === 2) {
				return;
			}
		/* falls through */
		case "auxclick":
		case "dblclick":
		case "mousedown":
		case "mousemove":
		case "mouseup":
		// TODO: Disabled elements should not respond to mouse events
		/* falls through */
		case "mouseout":
		case "mouseover":
		case "contextmenu":
			SyntheticEventCtor = SyntheticMouseEvent;
			break;
		case "drag":
		case "dragend":
		case "dragenter":
		case "dragexit":
		case "dragleave":
		case "dragover":
		case "dragstart":
		case "drop":
			SyntheticEventCtor = SyntheticDragEvent;
			break;
		case "touchcancel":
		case "touchend":
		case "touchmove":
		case "touchstart":
			SyntheticEventCtor = SyntheticTouchEvent;
			break;
		case "scroll":
			SyntheticEventCtor = SyntheticUIEvent;
			break;
		case "wheel":
			SyntheticEventCtor = SyntheticWheelEvent;
			break;
		case "copy":
		case "cut":
		case "paste":
			SyntheticEventCtor = SyntheticClipboardEvent;
			break;
		case "gotpointercapture":
		case "lostpointercapture":
		case "pointercancel":
		case "pointerdown":
		case "pointermove":
		case "pointerout":
		case "pointerover":
		case "pointerup":
			SyntheticEventCtor = SyntheticPointerEvent;
			break;
		default:
			// Unknown event. This is used by createEventHandle.
			break;
	}

	const inCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0;
	const accumulateTargetOnly = !inCapturePhase && domEventName === "scroll";

	// 触发accumulateSinglePhaseListeners()传入 fiber + React事件名称（比如onClick），通过fiber.props上的属性，获取对应的监听方法
	const listeners = accumulateSinglePhaseListeners(
		targetInst,
		reactName,
		nativeEvent.type,
		inCapturePhase,
		accumulateTargetOnly,
		nativeEvent,
	);
	if (listeners.length > 0) {
		// 创建合成事件对象_event = new SyntheticEventCtor()
		const event = new SyntheticEventCtor(
			reactName,
			reactEventType,
			null,
			nativeEvent,
			nativeEventTarget,
		);
		// 将合成事件对象 + fiber.props 获取到的回调函数数组加入到 dispatchQueue 中
		dispatchQueue.push({ event, listeners });
	}
}

type DispatchListener = {
	instance: null | Fiber;
	listener: Function;
	currentTarget: EventTarget;
};

export function accumulateSinglePhaseListeners(
	targetFiber: Fiber | null,
	reactName: string | null,
	nativeEventType: string,
	inCapturePhase: boolean,
	accumulateTargetOnly: boolean,
	nativeEvent: AnyNativeEvent,
): Array<DispatchListener> {
	const captureName = reactName !== null ? reactName + "Capture" : null;
	const reactEventName = inCapturePhase ? captureName : reactName;

	const listeners = [];

	let instance = targetFiber;
	let lastHostComponent = null;

	// 从当前fiber->fiber.return找到所有符合的事件
	while (instance) {
		const stateNode = instance.stateNode;

		if (instance.tag === HostComponent && stateNode !== null) {
			if (reactEventName) {
				const listener = getListener(instance);
				if (listener) {
					listeners.push(createDispatchListener());
				}
			}
		}
		if (accumulateTargetOnly) {
			break;
		}

		instance = instance.return;
	}
}

export { registerSimpleEvents as registerEvents, extractEvents };
