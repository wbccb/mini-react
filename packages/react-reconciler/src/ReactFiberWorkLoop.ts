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
	mergeLanes,
	markRootFinished,
} from "./ReactFiberLane";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
import {
	ContinuousEventPriority,
	DefaultEventPriority,
	DiscreteEventPriority,
	getCurrentUpdatePriority,
	IdleEventPriority,
	lanesToEventPriority,
} from "./ReactEventPriorities";
import {
	ImmediatePriority as ImmediateSchedulerPriority,
	UserBlockingPriority as UserBlockingSchedulerPriority,
	NormalPriority as NormalSchedulerPriority,
	IdlePriority as IdleSchedulerPriority,
	NormalPriority,
} from "shared";
import { getCurrentEventPriority } from "react-dom/client";
import { scheduleCallback, cancelCallback, IdlePriority, UserBlockingPriority } from "shared";
import { createFiber, createWorkInProgress } from "./ReactFiber";
import {
	BeforeMutationMask,
	LayoutMask,
	MutationMask,
	NoFlags,
	PassiveMask,
	StaticMask,
} from "./ReactFiberFlags";
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import {
	commitBeforeMutationEffects,
	commitLayoutEffects,
	commitMutationEffects,
} from "./ReactFiberCommitWork";
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

let workInProgressRootExitStatus: RootExitStatus = RootInProgress;
let subtreeRenderLanes: Lanes = NoLanes;
let workInProgressRootIncludedLanes: Lanes = NoLanes;

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
	``;
	if (nextLanes === NoLanes) {
		if (existingCallbackNode !== null) {
			cancelCallback(existingCallbackNode);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

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
		case DiscreteEventPriority:
			schedulerPriorityLevel = ImmediateSchedulerPriority;
			break;
		case ContinuousEventPriority:
			schedulerPriorityLevel = UserBlockingSchedulerPriority;
			break;
		case DefaultEventPriority:
			schedulerPriorityLevel = NormalSchedulerPriority;
			break;
		case IdleEventPriority:
			schedulerPriorityLevel = IdleSchedulerPriority;
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
		!includesBlockingLane(root, lanes) && !includesExpiredLane(root, lanes) && !didTimeout;

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
		if (renderWasConcurrent && !isRenderConsistentWithExternalStores(finishedWork)) {
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

function renderRootConcurrent(root: FiberRoot, lanes: Lanes): RootExitStatus {
	return RootCompleted;
}
function renderRootSync(root: FiberRoot, lanes: Lanes): RootExitStatus {
	const prevExecutionContext = executionContext;
	executionContext |= RenderContext;

	// 初始化时workInProgressRoot为null，workInProgressRootRenderLanes
	if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
		prepareFreshStack(root, lanes);
	}

	// 核心执行方法
	workLoopSync();

	executionContext = prevExecutionContext;
	workInProgressRoot = null;
	workInProgressRootRenderLanes = NoLanes;

	// workInProgressRootExitStatus的值会在各个方法中修改，比如prepareFreshStack()中改为：
	// workInProgressRootExitStatus = RootInProgress
	return workInProgressRootExitStatus;
}

function prepareFreshStack(root: FiberRoot, lanes: Lanes) {
	// 创建根fiber的复制品！！

	root.finishedWork = null;
	root.finishedLanes = NoLanes;

	workInProgressRoot = root;
	const rootWorkInProgress = createWorkInProgress(root.current!, null);
	workInProgress = rootWorkInProgress;
	workInProgressRootIncludedLanes = lanes;
	subtreeRenderLanes = lanes;
	workInProgressRootRenderLanes = lanes;
	workInProgressRootExitStatus = RootInProgress;

	finishQueueingConcurrentUpdates();
	return rootWorkInProgress;
}

function workLoopSync() {
	while (workInProgress !== null) {
		// 1个fiber=1个单元，workLoopSync会执行一个work=多个单元=多个fiber
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(unitOfWork: Fiber) {
	let current = unitOfWork.alternate;
	let next = beginWork(current, unitOfWork, subtreeRenderLanes);

	console.warn("beginWork得到的workInProgress.child", next);

	unitOfWork.memoizedProps = unitOfWork.pendingProps;

	if (next === null) {
		// 说明没有子节点，进行completeWork()处理
		// 在completeUnitOfWork()会将根据unitOfWork去给workInProgress赋值
		completeUnitOfWork(unitOfWork);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(unitOfWork: Fiber) {
	// 1. 如果unitOfWork有sibling，则return sibling，因为sibling可能beginWork()继续深度遍历子节点，继续beginWork()
	// 2. 如果unitOfWork没有sibling，则不断向上冒泡调用completeWork()
	// 3. 一般completeWork()只会返回null，如果返回不是null，说明这个fiber产生了新的work，需要继续对这个fiber进行beginWork()

	let completedWork: Fiber | null = unitOfWork;
	do {
		const current: Fiber | null = completedWork.alternate;
		const returnFiber: Fiber | null = completedWork.return;

		let next = completeWork(current, completedWork, subtreeRenderLanes);
		if (next !== null) {
			// 3.一般completeWork()只会返回null，如果返回不是null，说明这个fiber产生了新的work，需要继续对这个fiber进行beginWork()
			workInProgress = next;
			return;
		}
		if (completedWork.sibling) {
			workInProgress = completedWork.sibling;
			return;
		}

		completedWork = returnFiber;
		workInProgress = completedWork;
	} while (completedWork !== null);

	if (workInProgressRootExitStatus === RootInProgress) {
		// 我们已经到达root fiber
		workInProgressRootExitStatus = RootCompleted;
	}
}

function finishConcurrentRender(root: FiberRoot, exitStatus: RootExitStatus, lanes: Lanes) {
	switch (exitStatus) {
		case RootCompleted:
			commitRoot(root);
			break;
	}
}

function commitRoot(root: FiberRoot) {
	commitRootImpl(root);
}

let rootDoesHavePassiveEffects = false;
function commitRootImpl(root: FiberRoot) {
	const finishedWork: Fiber = root.finishedWork!; // root.current.alternate就是finishedWork
	const lanes = root.finishedLanes;

	root.finishedWork = null;
	root.finishedLanes = NoLanes;

	var remainingLanes: Lane = mergeLanes(finishedWork.lanes, finishedWork.childLanes);
	// remainingLanes = mergeLanes(remainingLanes, concurrentlyUpdatedLanes);

	// root.pendingLanes置为0，防止重复渲染，在ensureRootIsScheduled()会阻止
	markRootFinished(root, remainingLanes);

	if (
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
		(finishedWork.flags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHavePassiveEffects) {
			// rootDoesHavePassiveEffects控制不要重复触发
			rootDoesHavePassiveEffects = true;
			scheduleCallback(NormalPriority, function () {
				flushPassiveEffects();
				return null;
			});
		}
	}

	// 1. 判断是否需要有flags需要执行
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
		NoFlags;
	const rootHasEffect =
		(finishedWork.flags & (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
		NoFlags;

	if (subtreeHasEffects || rootHasEffect) {
		const prevExecutionContext = executionContext;
		executionContext |= CommitContext;
		// 2.1
		commitBeforeMutationEffects(root, finishedWork);
		// 2.2
		commitMutationEffects(root, finishedWork, lanes);

		// 切换双缓冲树
		root.current = finishedWork;

		// 2.3
		commitLayoutEffects(finishedWork, root, lanes);

		executionContext = prevExecutionContext;
	}

	if (rootDoesHavePassiveEffects) {
		rootDoesHavePassiveEffects = false;
	}

	ensureRootIsScheduled(root, now());
	// TODO 后续完善
	// flushSyncCallbacks()

	return null;
}

export function flushPassiveEffects(): boolean {
	return true;
}

function isRenderConsistentWithExternalStores(finishedWork: Fiber): boolean {
	// TODO 还不是很理解，后续再完善
	return false;
}

export { NoTimestamp, NoContext, requestEventTime, requestUpdateLane, ensureRootIsScheduled };
