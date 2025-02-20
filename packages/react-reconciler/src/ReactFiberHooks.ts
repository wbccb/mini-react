import { ContextDependency, Fiber } from "./ReactInternalTypes";
import { Props } from "react-dom/client";
import { Lane, Lanes, NoLanes, removeLanes } from "./ReactFiberLane";
import { scheduleUpdateOnFiber, State } from "./ReactFiberClassUpdateQueue";
import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop";
import {
	enqueueConcurrentClassUpdate,
	enqueueConcurrentHookUpdate,
} from "./ReactFiberConcurrentUpdates";
import { Flags, Passive, PassiveStatic, Update } from "./ReactFiberFlags";
import { HookFlags, HookHasEffect, HookLayout, HookPassive } from "./ReactHookEffectTags";
import objectIs from "shared/src/objectIs";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork";
import { ReactContext } from "shared";

let renderLanes: Lanes = NoLanes;
let currentlyRenderingFiber: Fiber | null = null;

let workInProgressHook: Hook | null = null;
let currentHook: Hook | null | undefined = null;

let ReactCurrentDispatcher = {
	current: null,
};

type Reducer = ((state: State, action: any) => any) | null;

export type FiberUpdate<S, A> = {
	lane: Lane;
	action: A;
	hasEagerState: boolean;
	eagerState: S | null;
	next: FiberUpdate<S, A> | null;
	desc?: string;
};

export interface FiberUpdateQueue<S, A> {
	pending: FiberUpdate<S, A> | null;
	lanes: Lanes;
	dispatch: ((arg0: A) => any) | null;
	lastRenderedReducer: Reducer;
	lastRenderedState: S | null;
}

type Hook = {
	memoizedState: any;
	baseState: any;
	baseQueue: FiberUpdate<any, any> | null;
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
	workInProgress.updateQueue = null;
	workInProgress.lanes = NoLanes;

	// 切换到mountReducer/updateReducer
	// ReactCurrentDispatcher.current =
	// 	current === null || current.memoizedState === null
	// 		? HooksDispatcherOnMount
	// 		: HooksDispatcherOnUpdate;

	const children = Component(props);

	renderLanes = NoLanes;
	currentlyRenderingFiber = null;

	currentHook = null;
	workInProgressHook = null;

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

	const queue: FiberUpdateQueue<any, any> = {
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

function dispatchReducerAction(fiber: Fiber, queue: FiberUpdateQueue<any, any>, action: any) {
	const lane = requestUpdateLane(fiber);
	const update: FiberUpdate<any, any> = {
		lane,
		action,
		hasEagerState: false,
		eagerState: null,
		next: null,
		desc: "我是useReducer-set方法触发的update:" + new Date().getTime(),
	};
	//
	const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
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

		// currentHook!.baseQueue = baseQueue;
		queue.pending = null;
	}
	let newState = currentHook!.baseState;
	// 遍历baseQueue的所有节点，不断调用reducer(最新state, action)来获取最新值 => 不断更新hook.baseState
	if (baseQueue !== null) {
		// 旧的tree是currentHook对应的tree，我们需要利用旧的tree去计算出新的值，然后赋值到新的tree上
		const first = baseQueue.next;

		let update = first;
		do {
			const action = update!.action;
			newState = reducer!(newState, action);

			update = update!.next;
		} while (update !== null && update !== first);
	}

	// 对于不需要更新的hook，baseQueue为空
	if (baseQueue === null) {
		queue.lanes = NoLanes;
	}

	if (!is(newState, hook.memoizedState)) {
		markWorkInProgressReceivedUpdate();
	}

	hook.memoizedState = newState;
	// 如果有shouldSkipUpdate=true，则hook.baseState=null,如果为false，则hook.baseState=newState
	hook.baseState = newState;

	// 	返回hook.memoizedState, dispatch
	return [hook.memoizedState, queue.dispatch];
}

function updateWorkInProgressHook() {
	const current: Fiber = currentlyRenderingFiber!.alternate!;
	// 更新模式会存在current
	currentlyRenderingFiber!.memoizedState = current.memoizedState;

	if (workInProgressHook === null) {
		// 头节点还没赋值
		workInProgressHook = currentlyRenderingFiber!.memoizedState;
		currentHook = current.memoizedState;
	} else {
		workInProgressHook = workInProgressHook.next;
		currentHook = currentHook!.next;
	}
	return workInProgressHook!;
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
	const queue: FiberUpdateQueue<any, any> = {
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

function is(x: any, y: any) {
	return (
		(x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y) // eslint-disable-line no-self-compare
	);
}

function dispatchSetState(fiber: Fiber, queue: FiberUpdateQueue<any, any>, action: any) {
	const lane = requestUpdateLane(fiber);
	const update: FiberUpdate<any, any> = {
		lane,
		action,
		hasEagerState: false,
		eagerState: null,
		next: null,
	};

	// 如果没有更新，则阻止将update加入到队列中，并且触发调度
	const alternate = fiber.alternate;
	if (fiber.lanes === NoLanes || alternate === null || alternate.lanes === NoLanes) {
		const lastRenderedReducer = queue.lastRenderedReducer;
		const currentState = queue.lastRenderedState;
		const eagerState = lastRenderedReducer!(currentState, action);
		if (is(currentState, eagerState)) {
			return;
		}
	}

	const root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
	if (root !== null) {
		const eventTime = requestEventTime();
		scheduleUpdateOnFiber(root, fiber, lane, eventTime);
	}
}

function updateState(initialState: State) {
	return updateReducer(basicStateReducer, initialState);
}

function useState(initialState: State) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		// mount初次加载
		return mountState(initialState);
	} else {
		// 更新流程
		return updateState(initialState);
	}
}

function bailoutHooks(current: Fiber, workInProgress: Fiber, lanes: Lanes) {
	workInProgress.updateQueue = current.updateQueue;

	workInProgress.flags &= ~(Passive | Update);
	current.lanes = removeLanes(current.lanes, lanes);
}

type StoreConsistencyCheck<T> = {
	value: T;
	getSnapshot: () => T;
};
export type Effect = {
	tag: HookFlags;
	create: CreateFnType;
	destroy: (() => void) | void | null;
	deps: DepsType;
	next: Effect | null;
};
export type FunctionComponentUpdateQueue = {
	lastEffect: Effect | null;
	stores: Array<StoreConsistencyCheck<any>> | null;
};

/**
 * 构建循环单链表结构数据
 */
function pushEffect(
	hookFlags: HookFlags,
	create: CreateFnType,
	destroy: (() => void) | void | null,
	deps: DepsType | null,
) {
	const effect: Effect = {
		tag: hookFlags,
		create: create,
		destroy: destroy,
		deps: deps,
		next: null,
	};
	let componentUpdateQueue: FunctionComponentUpdateQueue | null = currentlyRenderingFiber!
		.updateQueue as any;

	if (componentUpdateQueue === null) {
		componentUpdateQueue = createFunctionComponentUpdateQueue();
		currentlyRenderingFiber!.updateQueue = componentUpdateQueue as any;

		effect.next = effect;
		componentUpdateQueue.lastEffect = effect;
	} else {
		const lastEffect = componentUpdateQueue.lastEffect;
		if (lastEffect === null) {
			effect.next = effect;
			componentUpdateQueue.lastEffect = effect;
		} else {
			const firstEffect: Effect = lastEffect.next!;
			lastEffect.next = effect;
			effect.next = firstEffect;

			componentUpdateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function createFunctionComponentUpdateQueue(): FunctionComponentUpdateQueue {
	return {
		lastEffect: null,
		stores: null,
	};
}

function areHookInputsEqual(nextDeps: Array<any>, oldDeps: Array<any> | null) {
	if (oldDeps === null) return false;

	for (let i = 0; i < nextDeps.length && i < oldDeps.length; i++) {
		if (objectIs(nextDeps[i], oldDeps[i])) {
			continue;
		}

		return false;
	}
	return true;
}

function useEffectImpl(
	fiberFlags: Flags,
	hookFlags: HookFlags,
	create: CreateFnType,
	deps: DepsType,
) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		// mount
		const hook = mountWorkProgressHook();
		const nextDeps = deps === undefined ? null : deps;
		currentlyRenderingFiber!.flags |= fiberFlags;
		hook.memoizedState = pushEffect(HookHasEffect | hookFlags, create, undefined, nextDeps);
	} else {
		const hook: Hook = updateWorkInProgressHook() as Hook;
		const nextDeps = deps === undefined ? null : deps;
		let destroy: (() => void) | void | null = null;
		// 更新阶段，比较deps有没有变化

		// currentHook是根据代码的执行顺序确定的，这就是为什么useXX()要写在FunctionComponent最外层的原因
		// 比如useEffect() -> useLayoutEffect()
		// 那么你下一次执行就是 currentHook = useEffect()，然后才是currentHook = useLayoutEffect()，而不会先复制current = useLayoutEffect()
		// 因此当前currentHook就是目前的hook
		if (currentHook !== null) {
			const prevEffect: Effect = currentHook?.memoizedState;
			destroy = prevEffect.destroy;
			if (nextDeps !== null) {
				const prevDeps = prevEffect.deps as Array<any>;
				if (areHookInputsEqual(nextDeps, prevDeps)) {
					// 没有变化，不用更新
					// 重新调用pushEffect，传入hookFlags重置flags
					hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
					return;
				}
			}
		}

		// 如果需要更新，则设置flags为fiberFlags，并且pushEffect增加HookHasEffect
		currentlyRenderingFiber!.flags |= fiberFlags;
		hook!.memoizedState = pushEffect(HookHasEffect | hookFlags, create, destroy, nextDeps);
	}
}

function mountEffect(create: CreateFnType, deps: DepsType) {
	return useEffectImpl(Passive | PassiveStatic, HookPassive, create, deps);
}

function updateEffect(create: CreateFnType, deps: DepsType) {
	return useEffectImpl(Passive, HookPassive, create, deps);
}

type CreateFnType = () => (() => void) | void;
type DepsType = Array<any> | void | null;

function useEffect(create: CreateFnType, deps?: DepsType) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		return mountEffect(create, deps);
	} else {
		return updateEffect(create, deps);
	}
}

function mountLayoutEffect(create: CreateFnType, deps: DepsType) {
	return useEffectImpl(Update, HookLayout, create, deps);
}

function updateLayoutEffect(create: CreateFnType, deps: DepsType) {
	return useEffectImpl(Update, HookLayout, create, deps);
}

function useLayoutEffect(create: CreateFnType, deps?: DepsType) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		return mountLayoutEffect(create, deps);
	} else {
		return updateLayoutEffect(create, deps);
	}
}

function useMemo(create: CreateFnType, deps?: DepsType) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		const hook = mountWorkProgressHook();
		const nextDeps = deps === undefined ? null : deps;
		const nextValue = create();
		hook.memoizedState = [nextValue, nextDeps];
		return nextValue;
	} else {
		const hook = updateWorkInProgressHook();
		const nextDeps = deps === undefined ? null : deps;

		// 比对当前的deps是否发生了变化
		const prevState = hook?.memoizedState;
		if (prevState !== null && nextDeps !== null) {
			const prevDeps = prevState[1];
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				return prevDeps[0];
			}
		}

		// 如果deps已经变化，则重新计算memo，并且更新memoziedState
		const nextValue = create();
		hook.memoizedState = [nextValue, nextDeps];
		return nextValue;
	}
}

function useCallback(callback: CreateFnType, deps?: DepsType) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		const hook = mountWorkProgressHook();
		const nextDeps = deps === undefined ? null : deps;
		hook.memoizedState = [callback, nextDeps];
		return callback;
	} else {
		const hook = updateWorkInProgressHook();
		const nextDeps = deps === undefined ? null : deps;
		const prevState = hook.memoizedState;
		if (prevState !== null) {
			const prevDeps = prevState[1];
			if (prevDeps !== null && nextDeps !== null) {
				if (areHookInputsEqual(nextDeps, prevDeps)) {
					return prevState[0];
				}
			}
		}

		hook.memoizedState = [callback, nextDeps];
		return callback;
	}
}

function useRef(initialValue: any) {
	const current = currentlyRenderingFiber?.alternate;
	if (!current || current.memoizedState === null) {
		const hook = mountWorkProgressHook();
		const ref = {
			current: initialValue,
		};
		hook.memoizedState = ref;
		return ref;
	} else {
		const hook = updateWorkInProgressHook();
		return hook.memoizedState;
	}
}

function useContext(context: ReactContext) {
	return readContext(context);
}

let lastContextDependency: ReactContext;
function readContext(context: ReactContext) {
	const value = context._currentValue;
	if (lastContextDependency === context) {
		// 同一个fiber使用同一个useContext(FirstContext)只添加一次依赖即可
	} else {
		const contextItem: ContextDependency = {
			context: context,
			memoizedValue: value,
			next: null,
		};
		if (lastContextDependency === null) {
			lastContextDependency = context;
			currentlyRenderingFiber!.dependencies = {
				lanes: NoLanes,
				firstContext: contextItem,
			};
		} else {
			lastContextDependency.next = contextItem;
			lastContextDependency = lastContextDependency;
		}
	}
	return value;
}

export {
	renderWithHooks,
	useReducer,
	useState,
	bailoutHooks,
	useEffect,
	useLayoutEffect,
	useMemo,
	useCallback,
	useRef,
	useContext,
};
