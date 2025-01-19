---
outline: [1, 6]
---

# 前言

在前面的文章中，我们分析初次渲染的具体流程

接下来我们将着重于分析各种触发渲染更新的操作、更新时的diff流程、更新时联动hooks刷新的逻辑

## 文章内容概述
1. 分析`useReducer`的相关源码，了解任务的创建以及更新相关流程
2. 分析`useState`的相关源码，了解任务的创建以及更新相关流程
3. 以`useState`为基础，对整个更新流程进行简单的分析
4. 更新流程中的diff算法进行简单描述，侧重于各种`flags`的标记以及对应的更新方法
5. 分析其它常见的`useXXX`的相关源码

> workInProgress全局变量的赋值情况？？很多地方都有current以及workInProgress，它们的关系是怎么样的？

## 文章要解决的问题
1. `update`、`lane`、`task`之间的关系，它们是如何配合进行调度更新的？

> 有多种更新？元素更新？function更新？还有state更新？？

<br/>

# 1. useReducer
```javascript
const [reducerState, dispatch] = React.useReducer(reducer, {age: 42});
```

## 1.1 初始化mountReducer
在`FunctionComponent`类型`fiber`的`beginWork()`中，我们会触发

+ `mountIndeterminateComponent()`
+ `renderWithHooks()`

在`renderWithHooks()`我们会设置全局变量`currentlyRenderingFiber$1`为当前的`fiber`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case IndeterminateComponent: {
      return mountIndeterminateComponent(current, workInProgress, workInProgress.type, renderLanes);
    }
  }
}
function mountIndeterminateComponent(...) {
  value = renderWithHooks(...);
  //...
}
```

```javascript
function renderWithHooks() {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber$1 = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  //   function App(_ref) {
  //     var _React$useReducer = React.useReducer(reducer, { age: 42 })
  //     return React.createElement(
  //       "div",
  //       ...
  //     );
  //   }
  var children = Component(props, secondArg); // workInProgress.type
  renderLanes = NoLanes;
  currentlyRenderingFiber$1 = null;
  return children;
}
```

然后触发`Component()`，也就是`FunctionComponent()`中实际的内容，全部执行一遍，然后`return`对应的`React.createElement(...)`作为`fiber`赋值给`children`

> 根据当前`current`去切换`HooksDispatcherOnMount`/`HooksDispatcherOnUpdate`，对应不同的方法，因此初始化`React.useReducer`=`mountReducer`，而更新时`React.useReducer`=`updateReducer`

当我们在代码中有`React.useReducer()`时，会触发`mountReducer()`，如下面代码所示，在我们示例中，传入的

+ `initialArg`：`{age: 42}`
+ `init`：`undefined`

因此我们会根据`initialArg`初始化对应的值，然后根据赋值`hook`相关属性，包括

+ `memoizedState`
+ `baseState`
+ `queue`：包括`pending`、`lanes`、`dispatch`、`lastRenderedReducer`、`lastRenderedState`

```javascript
function useReducer(reducer, initialArg, init) {
    var dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg, init);
}
function mountReducer(reducer, initialArg, init) {
  var hook = mountWorkInProgressHook();
  var initialState;
  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg;
  }
  hook.memoizedState = hook.baseState = initialState;
  var queue = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  var dispatch = (queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber$1,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
```

### 1.1.1 fiber.memoizedState单链表结构存储hooks
从初始化`mountWorkInProgressHook()`方法可以知道，`hook`本身有一个`memoizedState`属性，`fiber`本身也有一个`memoizedState`属性，不同的是

+ `hook.memoizedState`存储的是`state`当前的值
+ `fiber.memoizedState`存储的是当前`fiber`（比如一个`FunctionComponent`类型的`fiber`）中的所有`hook`的第一个节点

```javascript
function mountWorkInProgressHook() {
  var hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };
  if (workInProgressHook === null) {
    currentlyRenderingFiber$1.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

最终`fiber.memoizedState`=`代码中第1个useReducer`+`代码中第2个useReducer`+...

> 注：`workInProgressHook`表示当前正在初始化的`hook`，不是`workInProgress`！！是两个不同的变量
>

### 1.1.2 hook 的更新方法初始化
当前`currentlyRenderingFiber$1`为`FunctionComponet`代表的`fiber`，`queue`代表的是当前`fiber`中其中一个`hook`的`queue`

```javascript
var queue = {
  pending: null,
  lanes: NoLanes,
  dispatch: null,
  lastRenderedReducer: reducer,
  lastRenderedState: initialState,
};
hook.queue = queue;
var dispatch = (queue.dispatch = dispatchReducerAction.bind(
  null,
  currentlyRenderingFiber$1,
  queue
));

function dispatchReducerAction(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  var update = {
    lane: lane,
    action: action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  var root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  if (root !== null) {
    var eventTime = requestEventTime();
    scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    entangleTransitionUpdate(root, queue, lane);
  }
}
```

## 1.2 dispatch创建更新
当我们在`onClick()`方法中触发`dispatch()`的时候，我们会进行`reducer`的调用，触发更新操作

> 我们触发了两次`dispatch1`，因此创建了两个`update`!!
>

```javascript
function reducer(state, {type}) {
    if (type === "incremented_age") {
        return {
            age: state.age + 1
        };
    }
    throw Error('Unknown action.');
}

const reducerJsx = (
    <React.Fragment>
        <span>reducer现在是：{reducerState.age}</span>
        <div>
            <button onClick={() => {
                dispatch1({type: "incremented_second"});
                dispatch1({type: "incremented_second"});
            }}>
                reducerState点击增加1
            </button>
        </div>
    </React.Fragment>
);
```

> 从`hook的更新方法初始化`可以知道，`dispatch()`实际上就是`dispatchReducerAction()`，因此涉及到两个问题
>
> + `dispatchReducerAction()`执行了什么？
> + 什么时候调用`reducer()`方法？以及发生了什么？
>

### 1.2.1 创建update并触发调度
从下面代码可以知道，主要分为几个步骤：

+ 创建`update`
+ 将`update`放入到队列中：`enqueueConcurrentHookUpdate()`
+ 处理队列中的`update`：`scheduleUpdateOnFiber()`

```javascript
function dispatchReducerAction(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  var update = {
    lane: lane,
    action: action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  var root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  if (root !== null) {
    var eventTime = requestEventTime();
    scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    entangleTransitionUpdate(root, queue, lane);
  }
}
```

#### 1.2.1.1 传入值fiber、queue、action分析
`fiber`：当前`FunctionComponet`代表的`fiber`

`queue`：当前`hook.queue`

`action`：当前`hook`所产生更新传入的参数，比如外部调用`setState({type: "a"})`，那么`action`=`{type: a}`

#### 1.2.1.2 创建update
使用`requestUpdateLane()`获取当前`fiber`的`lane`，然后构建`update`对象

#### 1.2.1.3 将update放入队列中enqueueConcurrentHookUpdate()
将当前`hook`创建的`update`压入`concurrentQueues`队列中，然后返回`HostRoot`

> 这里的`queue`是上面初始化`mountReducer()`构建`dispatch`更新方法时创建的`hook.queue`，对于同一个`hook`的`dispatch`更新方法多次调用，拿到的都是同一个`fiber`和`queue`，由于示例创建了两个`update`，这里压入了两次队列
>

```javascript
function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    var concurrentQueue = queue;
    var concurrentUpdate = update;
    enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
    return getRootForUpdatedFiber(fiber);
}
function enqueueUpdate(fiber, queue, update, lane) {
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
  concurrentlyUpdatedLanes = mergeLanes(concurrentlyUpdatedLanes, lane);
  fiber.lanes = mergeLanes(fiber.lanes, lane);
  var alternate = fiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
}
function mergeLanes(a, b) {
  return a | b;
}
function getRootForUpdatedFiber(sourceFiber) {
  var node = sourceFiber;
  var parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}
```

#### 1.2.1.4 开始调度scheduleUpdateOnFiber()
在我们首次渲染的文章中，我们已经详细分析了`scheduleUpdateOnFiber()`的流程，就是触发

```javascript
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  //...
  markRootUpdated(root, lane, eventTime);
  ensureRootIsScheduled(root, eventTime);
}
function ensureRootIsScheduled(root, currentTime) {
  var existingCallbackNode = root.callbackNode;
  markStarvedLanesAsExpired(root, currentTime);
  var nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes
  );
  if (nextLanes === NoLanes) {
    //...没有任务直接返回
    return;
  }
  // getHighestPriorityLane = 16
  var newCallbackPriority = getHighestPriorityLane(nextLanes);
  if (existingCallbackNode != null) {
    cancelCallback$1(existingCallbackNode);
  }
  var newCallbackNode;
  var schedulerPriorityLevel;
  switch (lanesToEventPriority(nextLanes)) {
    case DefaultEventPriority:
      schedulerPriorityLevel = NormalPriority;
      break;
    //...
  }
  newCallbackNode = scheduleCallback(
    schedulerPriorityLevel,
    performConcurrentWorkOnRoot.bind(null, root)
  );
  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}
```

### 1.2.2 调度中处理队列finishQueueingConcurrentUpdates()
从下面三段代码可以看出，`renderRootSync()`->`prepareFreshStack()`->`finishQueueingConcurrentUpdates()`

而`finishQueueingConcurrentUpdates()`做了两件事：

+ 从`concurrentQueues`取出`queue`、`update`、`lane`，将`queue`与`update`进行关联！
+ 触发`markUpdateLaneFromFiberToRoot()`将`lane`向`rootFiber`冒泡

?????后续我们需要根据`root.childLanes`取出优先级最高的`lane`，创建对应的`task`进行

> 我们从下面可以知道，最终`update`放入到`queue.pending`中，如果有多个`update`（相同`hook`触发），那么会形成一个循环单链表数据（尾部节点指向头部节点）
>

```javascript
function renderRootSync(root, lanes) {
  var prevExecutionContext = executionContext;
  executionContext |= RenderContext;

  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    //...
    workInProgressTransitions = getTransitionsForLanes(); // enableTransitionTracing=false，返回null
    prepareFreshStack(root, lanes);
  }
  workLoopSync();
  executionContext = prevExecutionContext;

  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  return workInProgressRootExitStatus;
}
function prepareFreshStack(root, lanes) {
  //...
  workInProgressRoot = root;
  var rootWorkInProgress = createWorkInProgress(root.current, null);
  workInProgress = rootWorkInProgress;
  workInProgressRootRenderLanes =
    subtreeRenderLanes =
    workInProgressRootIncludedLanes =
      lanes;
  //...
  finishQueueingConcurrentUpdates();
  return rootWorkInProgress;
}
```

```javascript
function finishQueueingConcurrentUpdates() {
  var endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;
  concurrentlyUpdatedLanes = NoLanes;
  var i = 0;

  while (i < endIndex) {
    var fiber = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var queue = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var update = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var lane = concurrentQueues[i];
    concurrentQueues[i++] = null;

    if (queue !== null && update !== null) {
      var pending = queue.pending;
      if (pending === null) {
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
    if (lane !== NoLane) {
      markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
}
```

```javascript
function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
  // Update the source fiber's lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  var alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
  //...
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane);
    }
    //...
    node = parent;
    parent = parent.return;
  }
  //...
}
```

## 1.3 触发全量渲染
> 处理fiber-updateFunctionComponent()
>

当`scheduleCallback()`触发调度时，会从`root`开始遍历所有节点触发重新渲染，从而触发`FunctionComponent`的`beginWork()`

此时`beginWork()`触发的是`updateFunctionComponent()`，从而再次触发`renderWithHooks()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case FunctionComponent: {
      var Component = workInProgress.type;
      //...
      return updateFunctionComponent(...);
    }
  }
}
function updateFunctionComponent() {
  nextChildren = renderWithHooks(...);

  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

而此时的`useReducer()`不再是`mountReducer`，而是`updateReducer()`

### 1.3.1 updateReducer()
+ 先使用`updateWorkInProgressHook()`构建出`hook`对象，从`hook`中取出`queue`
+ 将`queue.pending`，也就是`update`对象（根据`finishQueueingConcurrentUpdates()`分析）赋值到`baseQueue`中
+ 由于`queue.pending`拿到的是`hook`更新（多个更新update操作会形成一个`循环单向链表`）的最后一个节点，因此`baseQueue.next`可以拿到头节点，从头节点开始遍历整个链表，不断拿出`action`（也就是示例中`dispatch1({type: "incremented_second"})`的`{type: "incremented_second"}`)，触发`reducrer(上一次reducer计算出来的state，传入的数据)`来获取新的`state`值

> 当`update`===`first`时，说明已经`update`从`first`遍历到`first`
>

```javascript
function updateReducer(reducer, initialArg, init) {
  var hook = updateWorkInProgressHook();
  var queue = hook.queue;
  queue.lastRenderedReducer = reducer;
  var current = currentHook;
  var baseQueue = current.baseQueue;
  var pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  if (baseQueue !== null) {
    var first = baseQueue.next;
    var newState = current.baseState;
    var update = first;
    do {
      var action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== first);
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    queue.lastRenderedState = newState;
  }
  if (baseQueue === null) {
    // 不需要更新
    queue.lanes = NoLanes;
  }
  var dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}
```

#### 1.3.1.1 updateWorkInProgressHook()
- 先使用`currentlyRenderingFiber$1.memoizedState`获取当前渲染tree的头节点，如果该头节点不为空，则不断重用复用以该头节点构建的链表，不断
  - `nextWorkInProgressHook` = `workInProgressHook.next`
  - `workInProgressHook`=`nextWorkInProgressHook`

> 注：这里不是一个循环while，很多局部变量用一次就废弃了，比如`nextWorkInProgressHook`，每次进入`updateWorkInProgressHook()`都要重新赋值的，因此下面代码对比源码去除了无用的代码赋值


- 而`currentlyRenderingFiber$1.memoizedState`可能为空，因此我们可以复用
  - `current`=`currentlyRenderingFiber$1.alternate`
  - 使用`current.memoizedState`所代表的链表去复制一个新的`newHook`，然后赋值给`currentlyRenderingFiber$1.memoizedState`和`workInProgressHook`，此时`currentHook`代表着两棵tree相同位置对应的`hook`代码（`useXXX()`）
  - 在下一次触发`updateWorkInProgressHook()`时，如果`currentlyRenderingFiber$1.memoizedState`所代表的链表还是为空，则继续复用`alternate`，也就是`currentHook.next`去复制出新的`newHook`，然后`workInProgressHook.next`=`newHook`

> `currentlyRenderingFiber$1.memoizedState`可能为空发生在第一次更新？？因为双缓冲树只是在mount构建了其中的一棵。然后第一个更新，会切换到新的tree，此时`memoizedState`为空
>
> currentlyRenderingFiber$1.memoizedState不为空则发生在第二次～以后的更新？？




> 经过多次更新尝试，每次currentlyRenderingFiber$1.memoizedState都为空！！每次都需要构建新的newHook，太奇怪了...暂时放下，再找找资料
>

```javascript
function updateWorkInProgressHook() {
  var nextCurrentHook;

  if (currentHook === null) {
    var current = currentlyRenderingFiber$1.alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  var nextWorkInProgressHook;

  if (workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber$1.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    workInProgressHook = nextWorkInProgressHook;
    currentHook = nextCurrentHook;
  } else {
    currentHook = nextCurrentHook;
    var newHook = {
      memoizedState: currentHook.memoizedState,
      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,
      next: null,
    };

    if (workInProgressHook === null) {
      currentlyRenderingFiber$1.memoizedState = workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }

  return workInProgressHook;
}
```

上面的代码过于繁琐和难以看懂，我们可以简化为下面代码

由于是更新阶段，因此`currentlyRenderingFiber$1.alternate`必定存在，复用当前`alternate`的`memoizedState`构建链表数据，主要是 头节点的赋值 + 剩余节点的赋值 两个步骤



涉及到三个全局变量的赋值：

+ `currentHook`：代表的是当前`renderFiber.alternate`对应的`hook`
+ `currentlyRenderingFiber.memoizedState`：当前`renderFiber.alternate`复制的头节点
+ `workInProgressHook`：当前`renderFiber`对应的`hook`

```javascript
function updateWorkInProgressHook() {
	const current = currentlyRenderingFiber.alternate;
	// 更新模式会存在current
	if (workInProgressHook === null) {
		// 头节点还没赋值
		currentlyRenderingFiber.memoizedState = current.memoizedState;
		workInProgressHook = currentlyRenderingFiber.memoizedState;
		currentHook = current.memoizedState;
	} else {
		workInProgressHook = workInProgressHook.next;
		currentHook = currentHook.next;
	}
	return workInProgressHook;
}
```

<br/>

# 2. useState
## 2.1 初始化mountState
从上面`mountReducer()`的分析可以知道，我们会从`ClassComponent`的`beginWork()`开始触发，然后进行`useState()`的执行，初始化阶段`useState()`就是`mountState()`，与`mountReducer()`一样

+ 使用`mountWorkInProgressHook()`构建一个`hook`对象
+ 然后进行`initialState`的初始化，因为可能是`function`，因此执行`function()`获取初始的`state`值
+ 然后初始化`hook.queue`以及`hook.dispatch`方法

```javascript
function mountState(initialState) {
  var hook = mountWorkInProgressHook();
  if (typeof initialState === "function") {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  var queue = {
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  var dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber$1,
    queue
  ));
  return [hook.memoizedState, dispatch];
}

```

## 2.2 dispatchSetState创建更新
### 2.2.1 创建update->压入队列->触发调度
+ 创建`update`对象
+ 判断是否有上一次更新的值，如果有旧的值，比对两个值，如果没有变化则不会将`update`加入到队列中，也就是阻止没有改变的值重复进行渲染更新，当然`lane`也不会更新到`root`节点中
+ 如果有变化，则加入队列中`enqueueConcurrentHookUpdate`
+ 然后开始调用`scheduleUpdateOnFiber()`

> 上面的流程跟`useReducer()`相比较，只是多了一步新旧值的比对，其他核心逻辑几乎是一致的！
>

```javascript
function dispatchSetState(fiber, queue, action) {
  var lane = requestUpdateLane(fiber);
  var update = {
    lane: lane,
    action: action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  var alternate = fiber.alternate;
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes === NoLanes)
  ) {
    var lastRenderedReducer = queue.lastRenderedReducer;
    if (lastRenderedReducer !== null) {
      var currentState = queue.lastRenderedState;
      var eagerState = lastRenderedReducer(currentState, action);
      if (objectIs(eagerState, currentState)) {
        enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
        return;
      }
    }
  }
  var root = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
  if (root !== null) {
    var eventTime = requestEventTime();
    scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    entangleTransitionUpdate(root, queue, lane);
  }
}
```

### 2.2.2 调度中处理队列finishQueueingConcurrentUpdates()
```javascript
function renderRootSync(root, lanes) {
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    //...
    workInProgressTransitions = getTransitionsForLanes();
    prepareFreshStack(root, lanes);
  }
  workLoopSync();
  return workInProgressRootExitStatus;
}
function prepareFreshStack(root, lanes) {
  //...
  finishQueueingConcurrentUpdates();
  return rootWorkInProgress;
}
```

```javascript
function finishQueueingConcurrentUpdates() {
  var endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;
  concurrentlyUpdatedLanes = NoLanes;
  var i = 0;

  while (i < endIndex) {
    var fiber = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var queue = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var update = concurrentQueues[i];
    concurrentQueues[i++] = null;
    var lane = concurrentQueues[i];
    concurrentQueues[i++] = null;

    if (queue !== null && update !== null) {
      var pending = queue.pending;
      if (pending === null) {
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
    if (lane !== NoLane) {
      markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
}
```

## 2.3 触发全量渲染-函数组件beginWork()
经过`beginWork()`->`updateFunctionComponent()`，从而再次触发`renderWithHooks()`

而此时的`useState()`不再是`mountState`，而是`updateState()`，从下面代码可以知道，本质也是`updateReducer()`，只是为`useState()`自动设置了一个`reducer`方法=`basicStateReducer`

```javascript
function updateState(initialState) {
    return updateReducer(basicStateReducer, initialState);
}
function basicStateReducer(state, action) {
    return typeof action === "function" ? action(state) : action;
}
```

我们传入的`reducer`是`basicStateReducer`，然后进行`hook.queue.pending`->`baseQueue`，如果`baseQueue`为空，说明该`hook`没有更新，那么不触发`reducer()`执行以及`hook.memoziedState`的重新赋值！

```javascript
function updateReducer(reducer, initialArg, init) {
  var hook = updateWorkInProgressHook();
  var queue = hook.queue;
  queue.lastRenderedReducer = reducer;
  var current = currentHook;
  var baseQueue = current.baseQueue;
  var pendingQueue = queue.pending;
  if (pendingQueue !== null) {
    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }
  if (baseQueue !== null) {
    var first = baseQueue.next;
    var newState = current.baseState;
    var update = first;
    do {
      var action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== first);
    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    queue.lastRenderedState = newState;
  }
  if (baseQueue === null) {
    // 不需要更新
    queue.lanes = NoLanes;
  }
  var dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}
```


<br/>


# 3. 多种更新类型分析
> setState如何触发更新？
>
> 任务优先级如何排列？用户输入？setState又产生的任务优先级？functionComponent因为setState触发的渲染？
>
> 跟Vue的响应式重新渲染不同，它是全量渲染，每次diff进行标记“删除”，然后渲染时触发对应的删除逻辑
>

## 3.1 setState触发删除逻辑
### 3.1.1 deleteChild删除单个子节点
### 3.1.2 deleteRemainingChildren删除剩余节点
### 3.1.3 commit阶段处理ChildDeleteionsFalgs??


新增、删除、复用更新属性（可能会移动）

<br/>


# 4. diff算法简单解析
> 具体的diff算法查看下一篇文章进行了解



<br/>

# 5. 其他常见的useXXX源码分析
## 5.1 useEffect
## 5.2 useCallback
## 5.3 useLayoutEffect
## 5.4 useMemo
## 5.5 useContext
> 具体的context相关分析请看下一篇文章进行了解

<br/>

# 6. 问题总结
## 6.1 hook.baseQueue和hook.pending的区别是什么？
