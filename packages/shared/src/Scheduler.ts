import { Lane } from "react-reconciler";
import {
	IdlePriority,
	ImmediatePriority,
	LowPriority,
	NormalPriority,
	UserBlockingPriority,
	IMMEDIATE_PRIORITY_TIMEOUT,
	USER_BLOCKING_PRIORITY_TIMEOUT,
	NORMAL_PRIORITY_TIMEOUT,
	LOW_PRIORITY_TIMEOUT,
	IDLE_PRIORITY_TIMEOUT,
} from "./SchedulerPriorities.ts";
import { MinHeap, Task } from "./MinHeap.ts";

let getCurrentTime: () => number;
const hasPerformanceNow =
	typeof performance === "object" && typeof performance.now === "function";

if (hasPerformanceNow) {
	const localPerformance = performance;
	getCurrentTime = () => localPerformance.now();
} else {
	const localDate = Date;
	const initialTime = localDate.now();
	getCurrentTime = () => localDate.now() - initialTime;
}

let currentTask: Task | null = null;
var currentPriorityLevel = NormalPriority;

let taskIdCounter = 1; // taskId，不断进行递增

let isHostCallbackScheduled = false; // 防止多次触发: requestHostCallback(flushWork)
let isMessageLoopRunning = false; // 防止多次触发: MessageChannel的message.post(null)
let isPerformingWork = false; // 防止多次触发: flushWork(),本质就是workLoop()
let taskTimeoutID = -1;

let isHostTimeoutScheduled = false; // 倒计时timerQueue的task任务

let timerQueue = new MinHeap();
let taskQueue = new MinHeap();

function scheduleCallback(
	priorityLevel: Lane,
	callback: any,
	options?: { delay: number },
) {
	let currentTime = getCurrentTime();
	let startTime = currentTime;

	// 处理开始时间startTime
	if (options && options.delay && typeof options.delay === "number") {
		startTime = currentTime + options.delay;
	} else {
		startTime = currentTime;
	}

	// 处理过期时间expirationTime
	let timeout;
	switch (priorityLevel) {
		case ImmediatePriority:
			timeout = IMMEDIATE_PRIORITY_TIMEOUT;
			break;
		case UserBlockingPriority:
			timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
			break;
		case IdlePriority:
			timeout = IDLE_PRIORITY_TIMEOUT;
			break;
		case LowPriority:
			timeout = LOW_PRIORITY_TIMEOUT;
			break;
		case NormalPriority:
		default:
			timeout = NORMAL_PRIORITY_TIMEOUT;
			break;
	}
	const expirationTime = startTime + timeout;

	// 新建task
	const newTask: Task = {
		id: taskIdCounter++,
		callback,
		priorityLevel,
		startTime,
		expirationTime,
		sortIndex: -1,
	};

	// 放入到taskQueue中 Or 放入到timeQueue中
	if (startTime > currentTime) {
		newTask.sortIndex = startTime;
		timerQueue.push(newTask);
	} else {
		newTask.sortIndex = expirationTime;
		taskQueue.push(newTask);
	}

	if (taskQueue.isEmpty() && newTask === timerQueue.peek()) {
		// 如果taskQueue为空，则进行timerQueue的倒计时，此时的taskk
		if (isHostTimeoutScheduled) {
			cancelHostTimeout();
		} else {
			isHostTimeoutScheduled = true;
		}
		requestHostTimeout(handleTimeout, startTime - currentTime);
	} else {
		if (!isHostCallbackScheduled && !isPerformingWork) {
			// 如果只是!isHostCallbackScheduled可能导致任务变化了
			// 如果taskQueue不为空，则进行requestHostCallback()宏任务的调度
			// isPerformingWork代表只在执行work的多个task，除非shouldYieldToHost中断
			// 这里代表必须等中断完成后才能触发newTask->新的宏任务
			// 还有一些情况重新触发宏任务：hasMoreWork+时间还有的情况
			isHostCallbackScheduled = true;
			requestHostCallback(flushWork);
		}
	}
}

let scheduledHostCallback: ((currentTime: number) => boolean) | null = null;
function requestHostCallback(flushWork: (initTime: number) => boolean) {
	scheduledHostCallback = flushWork;
	if (!isHostCallbackScheduled) {
		isHostCallbackScheduled = true;
		schedulePerformWorkUntilDeadline();
	}
}

const channel = new MessageChannel();
channel.port1.onmessage = performWorkUntilDeadline;
function schedulePerformWorkUntilDeadline() {
	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		channel.port2.postMessage(null);
	}
}
function performWorkUntilDeadline() {
	// Mark: 我觉得下面这种情况不太可能会发生，源码中只处理isMessageLoopRunning，没处理isHostCallbackScheduled
	if (!scheduledHostCallback) {
		isMessageLoopRunning = false;
		return;
	}

	const currentTime = getCurrentTime();

	let hasMoreWork = true;
	try {
		// scheduledHostCallback=flushWork
		hasMoreWork = scheduledHostCallback(currentTime);
	} finally {
		if (hasMoreWork) {
			// 有更多任务，则继续post.message(null)触发宏任务
			// isMessageLoopRunning此时为true + isHostCallbackScheduled在flushWork已经改为false
			schedulePerformWorkUntilDeadline();
		} else {
			// 没有更多任务，则重置参数
			// 只要执行过scheduledHostCallback()，就会重置scheduledHostCallback参数
			isMessageLoopRunning = false;
			scheduledHostCallback = null;
		}
	}
}

function flushWork(initTime: number): boolean {
	if (!isPerformingWork) {
		return false;
	}

	isHostCallbackScheduled = false;
	isPerformingWork = true;
	const previousPriorityLevel = currentPriorityLevel;

	if (isHostTimeoutScheduled) {
		isHostTimeoutScheduled = false;
		cancelHostTimeout();
	}

	try {
		return workLoop(initTime);
	} finally {
		currentPriorityLevel = previousPriorityLevel;
		currentTask = null;
		isPerformingWork = false;
	}
}

function workLoop(initTime: number): boolean {
	let currentTime = initTime;
	advanceTimers(currentTime);
	// 从taskQueue中取出task
	currentTask = taskQueue.peek();
	while (currentTask !== null) {
		if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
			break;
		}

		const callback = currentTask.callback;
		if (typeof callback === "function") {
			currentTask.callback = null;
			currentPriorityLevel = currentTask.priorityLevel;

			// TODO 这个暂时还没涉及
			const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

			const continueCallback = callback(didUserCallbackTimeout);
			// MARK: 这里要重置时间！！！！！
			currentTime = getCurrentTime();
			if (continueCallback) {
				currentTask.callback = continueCallback;
			} else {
				// 如果已经执行完毕
				if (currentTask === taskQueue.peek()) {
					taskQueue.pop();
				}
			}

			// 执行完一个任务后，检测是否需要timerQueue->taskQueue
			advanceTimers(currentTime);
		} else {
			taskQueue.pop();
		}

		// 这里应该是advanceTimers上面已经调用了，如果typeof callback!=="function"
		// 那么这里不会耗时执行，那么就只用在可能耗时的callback()之后进行advanceTimers即可
		// advanceTimers(currentTime);
		currentTask = taskQueue.peek();
	}

	if (currentTask) {
		return true;
	} else {
		// 进行倒计时，因为taskQueue已经为空
		if (!timerQueue.isEmpty()) {
			const timerTask = timerQueue.peek()!;
			requestHostTimeout(handleTimeout, timerTask.startTime - currentTime);
		}
		return false;
	}
}

function shouldYieldToHost() {
	return true;
}

function advanceTimers(currentTime: number) {
	// 检测timerQueue能否将task移动到taskQueue中
	// 检测timerQueue是否有过期的task
	let task = timerQueue.peek();
	while (task !== null) {
		if (task.callback === null) {
			timerQueue.pop();
		} else {
			if (task.startTime <= currentTime) {
				timerQueue.pop();
				task.sortIndex = task.expirationTime;
				taskQueue.push(task);
			} else {
				return;
			}
		}
		task = timerQueue.peek();
	}
}

function requestHostTimeout(
	callback: (currentTime: number) => void,
	ms: number,
) {
	taskTimeoutID = setTimeout(() => {
		const currentTime = getCurrentTime();
		callback(currentTime);
	}, ms);
}

function handleTimeout(currentTime: number) {
	isHostTimeoutScheduled = false;
	// 检测timerQueue->taskQueue
	advanceTimers(currentTime);

	if (isHostCallbackScheduled) {
		// 检测目前是否有宏任务在执行
		return;
	}

	if (!taskQueue.isEmpty()) {
		isHostCallbackScheduled = true;
		// 如果目前taskQueue有task，触发requestHostCallback进行新一轮宏任务的调度
		requestHostCallback(flushWork);
	} else {
		// 如果没有taskQueue! 则继续倒计时（因为你已经检测过timerQueue->taskQueue了）是真的没task干了
		if (!timerQueue.isEmpty()) {
			const firstTask = timerQueue.peek()!;
			requestHostTimeout(handleTimeout, firstTask.startTime - currentTime);
		}
	}
}

function cancelHostTimeout() {
	clearTimeout(taskTimeoutID);
	taskTimeoutID = -1;
}

function cancelCallback(existingCallbackNode: Task) {
	existingCallbackNode.callback = null;
}

export { scheduleCallback, cancelCallback };
