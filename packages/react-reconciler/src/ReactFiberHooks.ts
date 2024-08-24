import { Fiber } from "./ReactInternalTypes.ts";
import { Props } from "react-dom/client";
import { Lane, Lanes, NoLanes } from "./ReactFiberLane.ts";
import { scheduleUpdateOnFiber, State } from "./ReactFiberClassUpdateQueue.ts";
import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop.ts";
import { enqueueConcurrentClassUpdate } from "./ReactFiberConcurrentUpdates.ts";

let renderLanes: Lanes = NoLanes;
let currentlyRenderingFiber: Fiber | null = null;

let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

let ReactCurrentDispatcher = {
	current: null,
};

type Reducer = ((state: State, action: any) => any) | null;

type Update<S, A> = {
	lane: Lane;
	action: A;
	hasEagerState: boolean;
	eagerState: S | null;
	next: Update<S, A> | null;
};

interface UpdateQueue<S, A> {
	pending: Update<S, A> | null;
	lanes: Lanes;
	dispatch: ((arg0: A) => any) | null;
	lastRenderedReducer: Reducer;
	lastRenderedState: S | null;
}

type Hook = {
	memoizedState: any;
	baseState: any;
	baseQueue: Update<any, any> | null;
	queue: any;
	next: Hook | null;
};

function renderWithHooks(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: (p: Props) => any,
	props: Props,
	nextRenderLanes: Lanes,
) {
	// 传入的current是双缓冲树的当前tree，可能为空，因为当前是mount阶段，双缓冲树都是空的
	// 传入的workInProgress就是构建的新的tree，不可能为空，无论是mount还是update，正在构建的都代表当前最新的UI，如果旧的tree不为空，则进行对比进行flags的设置
	renderLanes = nextRenderLanes;
	currentlyRenderingFiber = workInProgress;

	workInProgress.memoizedState = null;
	workInProgress.lanes = NoLanes;

	// 切换到mountReducer/updateReducer
	// ReactCurrentDispatcher.current =
	// 	current === null || current.memoizedState === null
	// 		? HooksDispatcherOnMount
	// 		: HooksDispatcherOnUpdate;

	const children = Component(props);

	renderLanes = NoLanes;
	currentlyRenderingFiber = null;

	return children;
}

function useReducer(reducer: Reducer, initialArg: any, init?: (initialArg: any) => State) {
	// 直接判断current === null || current.memoizedState === null来启用mount/update逻辑
	// 因为currentlyRenderingFiber = workInProgress，所以我们通过current = workInProgress.alternate
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		// 触发mount()逻辑
		return mountReducer(reducer, initialArg, init);
	} else {
		// 触发update()逻辑
		return updateReducer(reducer, initialArg, init);
	}
}

function mountReducer(reducer: Reducer, initialArg: any, init?: (initialArg: any) => State) {
	const hook = mountWorkProgressHook();
	let initialState: State;
	if (init !== undefined) {
		initialState = init(initialArg);
	} else {
		initialState = initialArg;
	}
	hook.memoizedState = hook.baseState = initialState;

	const queue: UpdateQueue<any, any> = {
		pending: null,
		lanes: NoLanes,
		dispatch: null,
		lastRenderedReducer: reducer,
		lastRenderedState: initialState,
	};
	hook.queue = queue;

	queue.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber!, queue);
	return [hook.memoizedState, queue.dispatch];
}

function mountWorkProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		baseState: null,
		baseQueue: null,
		queue: null,
		next: null,
	};
	if (workInProgressHook === null) {
		workInProgressHook = hook;
		currentlyRenderingFiber!.memoizedState = hook;
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook!;
}

function dispatchReducerAction(fiber: Fiber, queue: UpdateQueue<any, any>, action: any) {
	const lane = requestUpdateLane(fiber);
	const update: Update<any, any> = {
		lane,
		action,
		hasEagerState: false,
		eagerState: null,
		next: null,
	};
	// @ts-ignore
	const root = enqueueConcurrentClassUpdate(fiber, queue, update, lane);
	if (root !== null) {
		const eventTime = requestEventTime();
		scheduleUpdateOnFiber(root, fiber, lane, eventTime);
	}
}

function updateReducer(reducer: Reducer, initialArg: any, init?: (initialArg: any) => State) {
	// 构建fiber对应的hook对象
	const hook: Hook = updateWorkInProgressHook() as Hook;
	const queue = hook.queue;
	const pendingQueue = queue.pending;
	// 将当前hook的queue.pending复制到baseQueue中
	let baseQueue = currentHook!.baseQueue; // TODO 上一次还没更新完的Update对象？？需要确定场景
	if (pendingQueue !== null) {
		if (baseQueue !== null) {
			// 合并baseQueue和pendingQueue，然后再赋值给baseQueue进行处理
			const baseQueueFirst = baseQueue.next;
			const pendingQueueFirst = pendingQueue.next;
			baseQueue.next = pendingQueueFirst;
			pendingQueue.next = baseQueueFirst;
		}
		baseQueue = pendingQueue;

		currentHook!.baseQueue = baseQueue;
		queue.pending = null;
	}

	// 遍历baseQueue的所有节点，不断调用reducer(最新state, action)来获取最新值 => 不断更新hook.baseState
	if (baseQueue !== null) {
		// 旧的tree是currentHook对应的tree，我们需要利用旧的tree去计算出新的值，然后赋值到新的tree上
		const first = baseQueue.next;
		let newState = currentHook!.baseState;

		let update = first;
		do {
			const action = update!.action;
			newState = reducer!(newState, action);

			update = update!.next;
		} while (update !== null && update !== first);

		hook.memoizedState = newState;
		// 如果有shouldSkipUpdate=true，则hook.baseState=null,如果为false，则hook.baseState=newState
		hook.baseState = newState;
	}

	// 对于不需要更新的hook，baseQueue为空
	if (baseQueue === null) {
		queue.lanes = NoLanes;
	}
	// 	返回hook.memoizedState, dispatch
	return [hook.memoizedState, queue.dispatch];
}

function updateWorkInProgressHook() {
	const current: Fiber = currentlyRenderingFiber!.alternate!;
	// 更新模式会存在current
	if (workInProgressHook === null) {
		// 头节点还没赋值
		currentlyRenderingFiber!.memoizedState = current.memoizedState;
		workInProgressHook = currentlyRenderingFiber!.memoizedState;
		currentHook = current.memoizedState;
	} else {
		workInProgressHook = workInProgressHook.next;
		currentHook = currentHook!.next;
	}
	return workInProgressHook;
}

function basicStateReducer(state: State, action: any) {
	return typeof action === "function" ? action(state) : action;
}

function mountState(initialState: State) {
	const hook = mountWorkProgressHook();
	if (typeof initialState === "function") {
		initialState = initialState();
	}
	hook.memoizedState = hook.baseState = initialState;
	const queue: UpdateQueue<any, any> = {
		pending: null,
		lanes: NoLanes,
		dispatch: null,
		lastRenderedReducer: basicStateReducer,
		lastRenderedState: initialState,
	};
	hook.queue = queue;
	queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue);
	return [hook.memoizedState, queue.dispatch];
}

function dispatchSetState(fiber: Fiber, queue: UpdateQueue<any, any>, action: any) {}

export { renderWithHooks };
