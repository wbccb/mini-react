import { DOMEventName } from "../DOMEventNames";
import { Fiber } from "react-reconciler";
import type { DispatchQueue } from "../DOMPluginEventSystem";
import type { AnyNativeEvent, EventSystemFlags } from "../../events/PluginModuleType";
import {
	topLevelEventsToReactNames,
	registerSimpleEvents,
} from '../DOMEventProperties';


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

}

export { registerSimpleEvents as registerEvents, extractEvents };
