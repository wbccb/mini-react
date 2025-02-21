import { registerSimpleEvents } from "../DOMEventProperties";
import { DOMEventName } from "../DOMEventNames";
import { Fiber } from "react-reconciler";
import type { DispatchQueue } from "../DOMPluginEventSystem";
import type { AnyNativeEvent, EventSystemFlags } from "../../events/PluginModuleType";

function extractEvents(
	dispatchQueue: DispatchQueue,
	domEventName: DOMEventName,
	targetInst: null | Fiber,
	nativeEvent: AnyNativeEvent,
	nativeEventTarget: null | EventTarget,
	eventSystemFlags: EventSystemFlags,
	targetContainer: EventTarget,
) {}

export { registerSimpleEvents as registerEvents, extractEvents };
