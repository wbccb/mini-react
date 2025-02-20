import { ContextDependency, Fiber } from "./ReactInternalTypes";
import { includesSomeLane, Lanes } from "./ReactFiberLane";
import { REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED, ReactContext } from "shared";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork";

let currentlyRenderingFiber: Fiber | null = null;
let lastContextDependency: ContextDependency | null = null;
let lastFullyObservedContext: ReactContext | null = null;

export function prepareToReadContext(workInProgress: Fiber, renderLanes: Lanes) {
	currentlyRenderingFiber = workInProgress;
	lastContextDependency = null;
	lastFullyObservedContext = null;

	const dependencies = workInProgress.dependencies;
	if (dependencies !== null) {
		const firstContext = dependencies.firstContext;
		if (firstContext !== null) {
			if (includesSomeLane(dependencies.lanes, renderLanes)) {
				markWorkInProgressReceivedUpdate();
			}

			dependencies.firstContext = null;
		}
	}
}

let valueStack: any[] = [];
let index = -1;
let valueCursor = createCursor(null);
function createCursor(value: any) {
	return {
		current: value,
	};
}
function push(cursor: { current: any }, oldContextValue: any) {
	index++;
	valueStack[index] = cursor.current;
	cursor.current = oldContextValue;
}
export function pushProvider(fiber: Fiber, context: ReactContext, newValue: any) {
	// 将旧的<Context.Provider>的值缓存到valueStack中，然后使用新的<Context.Provider>放在context._currentValue
	// valueStack的顺序是 最新放在cursor.current -> 第二新放在valueStack[index]
	push(valueCursor, context._currentValue);
	context._currentValue = newValue;
}

function pop(cursor: { current: any }) {
	if (index < 0) {
		return;
	}
	const topValue = valueStack[index];
	cursor.current = topValue;
	valueStack[index] = null;

	index--;
}
export function popProvider(context: ReactContext) {
	const oldContextValue = valueCursor.current; // 遇到</Context.Provider>取出之前存储的值（放在cursor.current）
	pop(valueCursor);

	if (oldContextValue === REACT_SERVER_CONTEXT_DEFAULT_VALUE_NOT_LOADED) {
		context._currentValue = context._defaultValue;
	} else {
		context._currentValue = oldContextValue;
	}
}
