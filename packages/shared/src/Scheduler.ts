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
	if (options && options.delay) {
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
	};

	// 放入到taskQueue中 Or 放入到timeQueue中
	if (startTime > currentTime) {
		newTask.sortIndex = startTime;
		timerQueue.push(newTask);
	} else {
		newTask.sortIndex = expirationTime;
		taskQueue.push(newTask);
	}

	if (taskQueue.isEmpty()) {
		// 如果taskQueue为空，则进行timerQueue的倒计时，此时的taskk
		if (newTask === timerQueue.peek()) {
			if (isHostTimeoutScheduled) {
				cancelHostTimeout();
			} else {
				isHostTimeoutScheduled = true;
			}
			requestHostTimeout(handleTimeout, startTime - currentTime);
		}
	} else {
		// 如果taskQueue不为空，则进行requestHostCallback()宏任务的调度
		requestHostCallback(flushWork);
	}
}

let scheduledHostCallback: () => boolean;
function requestHostCallback(flushWork: () => boolean) {
	scheduledHostCallback = flushWork;
	if (!isHostCallbackScheduled) {
		isHostCallbackScheduled = true;
		schedulePerformWorkUtilDeadLine();
	}
}

const channel = new MessageChannel();
channel.port1.onmessage = performWorkUntilDeadline;
function schedulePerformWorkUtilDeadLine() {
	if (!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		channel.port2.postMessage(null);
	}
}
function performWorkUntilDeadline() {
	// 宏任务触发这里执行
	isMessageLoopRunning = false;

	// scheduledHostCallback=flushWork
	const hasMoreWork = scheduledHostCallback();
	if (hasMoreWork) {
		schedulePerformWorkUtilDeadLine();
	}
}

function flushWork(): boolean {
	if (!isPerformingWork) {
		return false;
	}

	isPerformingWork = true;
	try {
		return workLoop();
	} finally {
		isPerformingWork = false;
	}
}

function workLoop(): boolean {
	const currentTime = getCurrentTime();
	advanceTimers(currentTime);
	// 从taskQueue中取出task
	currentTask = taskQueue.peek();
	while (currentTask !== null) {
		if (currentTask.expirationTime < currentTime && shouldYieldToHost()) {
			break;
		}

		const callback = currentTask.callback;
		currentTask.callback = null;
		if (callback) {
			const continueCallback = callback();
			if (continueCallback) {
				currentTask.callback = continueCallback;
			} else {
				// 如果已经执行完毕，则等待下一次while循环将task弹出
			}
		} else {
			if (currentTask === taskQueue.peek()) {
				taskQueue.pop();
			}
		}
		advanceTimers(currentTime);
		currentTask = taskQueue.peek();
	}

	if (currentTask) {
		return true;
	} else {
		// 进行倒计时，因为taskQueue已经为空
		if (!timerQueue.isEmpty()) {
			const timerTask = timerQueue.peek()!;
			requestHostTimeout(handleTimeout, timerTask?.startTime - currentTime);
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
	// 检测timerQueue->taskQueue
	advanceTimers(currentTime);
	if (!taskQueue.isEmpty()) {
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
