import {
	Lane,
	Lanes,
	NoLane,
	NoLanes,
	pickArbitraryLane,
	SyncLane,
	markStarvedLanesAsExpired,
	getNextLanes,
	getHighestPriorityLane,
	includesBlockingLane,
	includesExpiredLane,
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
	cancelCallback,
} from "shared";
type ExecutionContext = number;

const NoTimestamp = -1;
let currentEventTime: number = NoTimestamp;
let currentEventTransitionLane: Lanes = NoLanes;

const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
const CommitContext = /*                */ 0b100;

// 代表着渲染结束时的状态：是正常还是异常还是中断！
type RootExitStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const RootInProgress = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;
const RootDidNotComplete = 6;

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

function performConcurrentWorkOnRoot(root: FiberRoot, didTimeout?: boolean) {
	// 省略很多lanes===NoLanes或者xxx===null的判断，因为这些判断会让mini-react项目很臃肿

	const originalCallbackNode = root.callbackNode;

	const lanes = getNextLanes(
		root,
		root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
	);

	// const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
	// const continueCallback = callback(didUserCallbackTimeout);
	// 如果当前task已经过期（didTimeout等于true)，那么shouldTImeSlice=false，代表task必须马上执行，不能使用时间切片了！！！必须同步！马上！now！
	// 当然如果lanes包含了过期的lane 或者 包含了同步lane，那么shouldTImeSlice=false，必须马上执行，不能使用时间切片
	const shouldTImeSlice =
		!includesBlockingLane(root, lanes) &&
		!includesExpiredLane(root, lanes) &&
		!didTimeout;

	let exitStatus;
	// render阶段
	if (shouldTImeSlice) {
		exitStatus = renderRootConcurrent(root, lanes);
	} else {
		exitStatus = renderRootSync(root, lanes);
	}

	if (exitStatus !== RootInProgress) {
		// 检测是否可能还没render完毕

		const renderWasConcurrent = !includesBlockingLane(root, lanes);
		const finishedWork = root.current?.alternate!;
		if (
			renderWasConcurrent &&
			!isRenderConsistentWithExternalStores(finishedWork)
		) {
			// TODO 还不是很理解这个场景，后续再完善
		}

		// commit阶段
		root.finishedWork = finishedWork;
		root.finishedLanes = lanes;
		finishConcurrentRender(root, exitStatus, lanes);
	}

	ensureRootIsScheduled(root, now());

	if (root.callbackNode === originalCallbackNode) {
		// TODO 还不是很理解这个场景，后续再完善
		// 这里的callback()要返回什么值？
		// 为什么跟hasWork()有关？？
		// 在Scheduler.ts中callback(didUserCallbackTimeout)返回一个function
		// 这个function继续放在task.callback中
		// 这里的root.callbackNode本质就是FiberRoot.task属性还是原来的那个task
		// 在上面ensureRootIsScheduled()会调用newCallbackNode=scheduleCallback()
		// 然后设置root.callbackNode = newCallbackNode
	}

	return null;
}

function renderRootConcurrent(root: FiberRoot, lanes: Lanes): RootExitStatus {}
function renderRootSync(root: FiberRoot, lanes: Lanes): RootExitStatus {}

function finishConcurrentRender(
	root: FiberRoot,
	exitStatus: RootExitStatus,
	lanes: Lanes,
) {}

function isRenderConsistentWithExternalStores(finishedWork: Fiber): boolean {
	// TODO 还不是很理解，后续再完善
	return false;
}

export {
	NoTimestamp,
	NoContext,
	requestEventTime,
	requestUpdateLane,
	ensureRootIsScheduled,
};
