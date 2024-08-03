import {
	Lane,
	Lanes,
	NoLane,
	NoLanes,
	pickArbitraryLane,
	SyncLane,
} from "./ReactFiberLane.ts";
import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode.ts";
import {
	DefaultEventPriority,
	getCurrentUpdatePriority,
	lanesToEventPriority,
} from "./ReactEventPriorities.ts";
import { getCurrentEventPriority } from "react-dom/client";
import {
	NormalPriority as NormalSchedulerPriority,
	scheduleCallback,
} from "shared";
type ExecutionContext = number;

const NoTimestamp = -1;
let currentEventTime: number = NoTimestamp;
let currentEventTransitionLane: Lanes = NoLanes;

const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
const CommitContext = /*                */ 0b100;

let executionContext: ExecutionContext = NoContext;
let workInProgressRoot: FiberRoot | null = null;
let workInProgress: Fiber | null = null;
let workInProgressRootRenderLanes: Lanes = NoLanes;

function now() {
	return window.performance.now();
}

function requestEventTime() {
	if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
		// We're inside React, so it's fine to read the actual time.
		return now();
	}
	// We're not inside React, so we may be in the middle of a browser event.
	if (currentEventTime !== NoTimestamp) {
		// Use the same start time for all updates until we enter React again.
		return currentEventTime;
	}
	// This is the first update since React yielded. Compute a new start time.
	currentEventTime = now();
	return currentEventTime;
}

function requestUpdateLane(fiber: Fiber): Lane {
	const mode = fiber.mode;
	if ((mode && ConcurrentMode) === NoMode) {
		return SyncLane as Lane;
	} else if (
		(executionContext & RenderContext) !== NoContext &&
		workInProgressRootRenderLanes !== NoLanes
	) {
		// 当前executionContext状态=RenderContext
		return pickArbitraryLane(workInProgressRootRenderLanes);
	}

	const updateLane: Lane = getCurrentUpdatePriority();
	if (updateLane !== NoLane) {
		return updateLane;
	}

	const eventLane: Lane = getCurrentEventPriority();
	return eventLane;
}

function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
	var existingCallbackNode = root.callbackNode;

	// 检查`root.pendingLanes`是否存在`lane`一直没执行，将它从`pendingLanes`移动到`root.expiredLanes`
	markStarvedLanesAsExpired();

	// 得到下一个lanes
	var nextLanes = getNextLanes(
		root,
		root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
	);
	// 从lanes中拿到优先级最高的lane
	var newCallbackPriority = getHighestPriorityLane(nextLanes);

	// 取消已经存在的lane
	if (existingCallbackNode != null) {
		cancelCallback(existingCallbackNode);
	}

	let newCallbackNode;
	let schedulerPriorityLevel;
	// 从nextLanes的lanes中取出优先级最高的lane，判断属于哪个eventLane
	// 将eventLane -> 转化为：xxxPriority
	switch (lanesToEventPriority(nextLanes)) {
		case DefaultEventPriority:
			schedulerPriorityLevel = NormalSchedulerPriority;
			break;
		default:
			schedulerPriorityLevel = NormalSchedulerPriority;
			break;
	}
	newCallbackNode = scheduleCallback(
		schedulerPriorityLevel,
		performConcurrentWorkOnRoot.bind(null, root),
	);
	root.callbackPriority = newCallbackPriority;
	root.callbackNode = newCallbackNode;
}

function performConcurrentWorkOnRoot(root: FiberRoot, didTimeout?: boolean) {}

export {
	NoTimestamp,
	NoContext,
	requestEventTime,
	requestUpdateLane,
	ensureRootIsScheduled,
};
