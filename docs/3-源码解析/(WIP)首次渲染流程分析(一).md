---
outline: deep
---

# 前言
为了减少复杂度，本文初次流程分析都是根据下面调试代码进行，即可能存在非下面调试代码触发的初次渲染的分支代码（包括`并发`或者`一些其它没使用的API`的代码）被删除，没有进行展示和分析



本文集中于初次渲染的流程分析，由于初次渲染没有进行并发渲染更新（初次渲染都是同步执行），因此本文并发更新的内容不会过多分析，而是放在后续的渲染更新文章中进行具体的分析

## 调试代码
```javascript
const App = function () {
  const [testValue, setTestValue] = React.useState("11");
  console.log("重新更新");

  const array = new Array(100).fill(0);

  const mockLongTask = () => {
    let count = 0;
    for (let i = 0; i < 100; i++) {
      count = (count + i) % 100;
    }
    console.log(count);
  };

  React.useEffect(() => {
    console.error("useEffect执行");
  }, [testValue]);

  return (
          <div>
            <span>测试</span>
            {array.map((item, index) => {
              return (
                      <input
                              key={index}
                              value={testValue + index}
                              onChange={(event) => {
                                setTestValue(event.target.value);
                                mockLongTask();
                              }}
                      />
              );
            })}
          </div>
  );
};

const domNode = document.getElementById("root");
const root = ReactDOM.createRoot(domNode);
root.render(<App />);
```

# 队列处理逻辑总结
> 整个渲染流程本质就是创建一个队列进行处理，这里先进行总结分析，为下面的复杂分析流程提供一个思路，避免陷入细节中无法理解整体流程
>

## 创建队列
## 压入队列
## 处理队列
# ReactDOM.createRoot()
一系列对象的初始化和事件初始化

```javascript
function createRoot(container, options) {
  //...
  var root = createContainer(
          container,
          ConcurrentRoot,
          null,
          isStrictMode,
          concurrentUpdatesByDefaultOverride,
          identifierPrefix,
          onRecoverableError
  );
  markContainerAsRoot(root.current, container);
  //...
  listenToAllSupportedEvents(rootContainerElement);
  return new ReactDOMRoot(root);
}
```

## 1.1 createContainer()
本质就是调用`createFiberRoot()`：

1. 创建 `root` = `new FiberRootNode()`对象（一个非常普通的对象具有一些特定的属性）
2. 创建 `uninitializedFiber` = `new FiberNode()`对象（一个非常普通的对象具有一些特定的属性）
3. `FiberRootNode`和`FiberNode`相互绑定
4. 初始化`root`对应`fiber`的`state`对象，放入`fiber.memoizedState`中
5. `initializeUpdateQueue()`：`fiber.updateQueue`初始化（`updateQueue`也是一个非常普通的对象具有一些特定的属性）

```javascript
function createContainer() {
  return createFiberRoot(...);
}
function createFiberRoot(...) {
  var root = new FiberRootNode(...);
  var uninitializedFiber = createHostRootFiber(tag, isStrictMode);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;
  //...
  var initialState = {...};
  uninitializedFiber.memoizedState = initialState;

  initializeUpdateQueue(uninitializedFiber);
  return root;
}
function FiberRootNode(...) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  //...
}
function createHostRootFiber() {
  return createFiber(HostRoot, null, null, mode);
}
var createFiber = function (...) {
  return new FiberNode(...);
}
function FiberNode(...) {
  this.tag = tag;
  this.key = key;
  //...
}
function initializeUpdateQueue(fiber) {
  var queue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null,
      lanes: NoLanes,
    },
    effects: null,
  };
  fiber.updateQueue = queue;
}
```

## 1.2 markContainerAsRoot()
`root.current`为创建的`fiber`，`container`为传入的`dom`

下面这一行本质就是`container[xxxx] = root.current`(数据绑定)

```javascript
// markContainerAsRoot(root.current, container);
function markContainerAsRoot(hostRoot, node) {
  node[internalContainerInstanceKey] = hostRoot;
}
```

## 1.3 listenToAllSupportedEvents()
为`rootDOM`注册所有支持的原生事件监听

> 由于这一块比较复杂，后面会出一篇文章具体分析`listenToAllSupportedEvents`，后面完成后再补充链接到这里
>

## 1.4 new ReactDOMRoot(root)
将新建的`FiberRootNode`对象放入到`this._internalRoot`中

```javascript
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
```

# render()
本质调用的是`updateContainer()`方法

```javascript
ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = {
  //...
  updateContainer(children, root, null, null);
};
```

而`updateContainer()`方法主要分为：

+ `requestUpdateLane()`创建`update`对应的`lane`
+ `createUpdate()`创建更新`update`对象
+ `createUpdate()`创建更新`updateQueue`队列
+ `enqueueUpdate()`将`update`放入队列中
+ `scheduleUpdateOnFiber()`处理队列
+ `entangleTransitionUpdate()`处理`Transition lanes`的更新

```javascript
function updateContainer(...) {
  var current = container.current;
  var lane = requestUpdateLane(current);
  //...
  var update = createUpdate(eventTime, lane);
  update.payload = {
    element: element,
  };
  //...
  var root = enqueueUpdate$1(current, update, lane);
  if (root !== null) {
    scheduleUpdateOnFiber(root, current, lane, eventTime);
    entangleTransitions(root, current, lane);
  }
  return lane;
}
```

## requestUpdateLane()
从`ReactDOM.createRoot()`的分析可以知道，一开始会传入`ConcurrentRoot`进行`fiberRoot`的创建，此时`mode = ConcurrentMode`

```javascript
function createRoot(container, options) {
  var root = createContainer(
          container,
          ConcurrentRoot,
          null,
          isStrictMode,
          concurrentUpdatesByDefaultOverride,
          identifierPrefix,
          onRecoverableError
  );
}
function createHostRootFiber(tag) {
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;
  } else {
    mode = NoMode;
  }
}
```

由于`mode = ConcurrentMode`，而且

+ `executionContext`未设置值，为0，即`NoContext`
+ `workInProgressRootRenderLanes`未设置值，为0，即`NoLanes`
+ `getCurrentUpdatePriority()`未设置值，为0

因此整体代码会走到`getEventPriority()`，直接返回`DefaultEventPriority`=`DefaultLane`=`16`

```javascript
function requestUpdateLane(fiber) {
  var mode = fiber.mode;
  if ((mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  } else if (
          (executionContext & RenderContext) !== NoContext &&
          workInProgressRootRenderLanes !== NoLanes
  ) {
    return pickArbitraryLane(workInProgressRootRenderLanes);
  }
  var isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    //...
  }
  var updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }

  var eventLane = getCurrentEventPriority();
  return eventLane;
}
function getCurrentEventPriority() {
  var currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type);
}
function getEventPriority(domEventName) {
  // domEventName = "DOMContentLoaded"
  switch (domEventName) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
          //...
    default:
      return DefaultEventPriority;
  }
}
```

## createUpdate()创建更新队列
从`requestUpdateLane()`中得到`lane=DefaultLane=16`后创建一个`update`的普通对象

```javascript
var update = createUpdate(eventTime, lane); 
```

```javascript
function createUpdate(eventTime, lane) {
    var update = {
        eventTime: eventTime,
        lane: lane,
        tag: UpdateState,
        payload: null,
        callback: null,
        next: null
    };
    return update;
}
```

## enqueueUpdate()将update放入队列中
整体逻辑比较简单，最终触发

+ `enqueueUpdate()`：直接将创建的`update`放入到全局对象`concurrentQueues`中，并且处理下`lanes`
+ `getRootForUpdatedFiber()`：往上寻找到`parent`，返回`HostRoot`的`node.stateNode`

```javascript
function enqueueUpdate$1(fiber, update, lane) {
  var updateQueue = fiber.updateQueue;
  var sharedQueue = updateQueue.shared;
  //...
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
}
function enqueueConcurrentClassUpdate(fiber, queue, update, lane) {
  //...
  enqueueUpdate(fiber, concurrentQueue, concurrentUpdate, lane);
  return getRootForUpdatedFiber(fiber);
}
```

```javascript
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
```

```javascript
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

## scheduleUpdateOnFiber()处理队列
```javascript
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  //...
  markRootUpdated(root, lane, eventTime);

  ensureRootIsScheduled(root, eventTime);

  if (
    lane === SyncLane &&
    executionContext === NoContext &&
    (fiber.mode & ConcurrentMode) === NoMode
  ) {
    resetRenderTimer();
    flushSyncCallbacksOnlyInLegacyMode();
  }
}
```

### markRootUpdated()
`root.pendingLanes`：包含了当前`rootFiber`树中所有待处理的`update`的`lane`(包含所有`childFiber`的`update`)，可以根据`pendingLanes`一定范围的取值去拿到当前优先级最高的`lanes`，然后赋值给`renderLanes`，后续遍历`updateQueue`时可以判断当前`update`是否就是`renderLanes`的值得到当前优先级最高的`update`更新对象  
注：因为diff是从root开始的，因此将所有更新信息都同步到root可以知道要跳过哪些更新

```javascript
root.pendingLanes |= updateLane;
```

### ensureRootIsScheduled()
从下面代码可以知道，主要分为：

+ 2.4.2.1 `markStarvedLanesAsExpired()`饥饿问题处理，避免低优先级一直无法执行
+ 2.4.2.2 `getNextLanes()`获取下一个要执行的`lanes`（注意不是`lane`)
+ 2.4.2.3 `getHighestPriorityLane()`获取最高优先级的`lane`，首次渲染拿到`getHighestPriorityLane` = `16`
+ 2.4.2.4 `scheduleCallback()`进行

```javascript
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

#### markStarvedLanesAsExpired饥饿问题
> 低优先级任务一直被高优先级任务打断，检查低优先级任务是否一直堵塞，强制转化为过期任务提高优先级
>

检查`root.pendingLanes`是否存在`lane`一直没执行，将它从`pendingLanes`移动到`root.expiredLanes`



从下面代码可以知道，

使用`pickArbitraryLaneIndex()`获取当前`lanes`最左边1对应的`index`，比如

> `lanes`=`000000011000 `=> `pickArbitraryLaneIndex()`=> index=4
>
> `lane`=`000000010000`
>

检测这个位置的`expirationTime`是否存在，如果不存在

+ `computeExpirationTime()`：根据`lane`类型，然后加上当前时间+一定的过期时间，比如现在是当前时间是`12:40:00`，那么它的过期时间就是`12:40:00`+`250`，`250`毫秒后还没执行，证明它进入饥饿状态（除了饥饿，还有死锁、活锁等并发问题）
+ 如果当前`lane`（可以简单认为某一个任务）已经等待很久还没执行（一直被高优先级任务打断），强行将当前`lane`放入`root.expiredLanes`
+ 然后从`root.pendingLanes`中剔除当前`lane`: `lanes &= ~lane`

> `root.pendingLanes`: 等待执行的任务
>
> `root.expiredLanes`: 已经过期的任务，必须马上执行
>

```javascript
function markStarvedLanesAsExpired(root, currentTime) {
  var pendingLanes = root.pendingLanes;
  var expirationTimes = root.expirationTimes;
  var lanes = pendingLanes;

  while (lanes > 0) {
    var index = pickArbitraryLaneIndex(lanes);
    var lane = 1 << index;
    var expirationTime = expirationTimes[index];

    if (expirationTime === NoTimestamp) {
      // 找到一个等待的lane，并且不是suspended/pinged，计算一个过期时间
      if (
        (lane & suspendedLanes) === NoLanes ||
        (lane & pingedLanes) !== NoLanes
      ) {
        expirationTimes[index] = computeExpirationTime(lane, currentTime);
      }
    } else if (expirationTime <= currentTime) {
      root.expiredLanes |= lane;
    }

    lanes &= ~lane;
  }
}

function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
      //...
      return currentTime + 250;
    //...
  }
}
```

#### getNextLanes()
> 由于这一块比较复杂，涉及到大量`lanes`的计算，后面会出一篇文章具体分析`lane`，后面完成后再补充链接到这里
>

#### getHighestPriorityLane()
`lanes`的位置是有优先级区分的，高优先级会放在最右边



如下面代码所示，`SyncLane`占据了最右边的`index`，当我们想要获取最高优先级`lane`时，我们就使用`lanes & -lanes`获取最右边`1`的位置，通过与`SyncLane`/`InputContinuousHydrationLane`/`DefaultLane`的`&`运算就可以得出目前执行什么类型的`lane`

```javascript
function getHighestPriorityLane(lanes) {
    return lanes & -lanes;
}
```

```javascript
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111111000000;
```

#### scheduleCallback()
使用的是`scheduler`调度器的`unstable_scheduleCallback()`方法

> 由于这一块内容较多，将在下一个大点`scheduleCallback()`中进行分析
>

# scheduler
## scheduleCallback()
下面代码虽然很长，但是实际的逻辑是非常简单的，主要集中在几个方面：

+ `taskQueue`：存储普通任务的队列
+ `timerQueue`：存储延迟任务的队列，可以简单理解为需要延迟一定时间才执行的任务，跟普通任务相比较，普通任务是因为当前没有时间给你执行，需要等待，但是延迟任务是需要延迟一定时间才执行

而队列中的优先级是使用`newTask.sortIndex = startTime`进行区分，同时还具有过期时间`expirationTime`（防止这个任务一直被其它高优先级抢占资源无法执行，当达到过期时间后，它就可以强行去抢占资源执行）



因此下面的代码中，先处理了`startTime`和`expirationTime`(`startTime + timeout`)，然后构建一个新的`newTask`，放入`taskQueue`或者`timerQueue`

+ 如果当前新建`newTask`属于`延迟Task`，判断`taskQueue`是不是没有任务需要执行，如果没有则触发`requestHostTimeout()`进行倒计时（`newTask`的延迟时间倒计时），看看能不能把`timerQueue`的任务挪到`taskQueue`执行
+ 如果当前新建`newTask`属于`普通Task`，加入`taskQueue`，然后触发`requestHostCallback(flushWork)`进行任务优先级队列的调度（根据`sortIndex`执行)

最终返回新创建的`newTask`给`root.callbackNode = newCallbackNode(newTask)`

```javascript
function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime();
  var startTime;

  if (typeof options === "object" && options !== null) {
    var delay = options.delay;
    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  switch (priorityLevel) {
    //...
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  var expirationTime = startTime + timeout;
  var newTask = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: startTime,
    expirationTime: expirationTime,
    sortIndex: -1,
  };

  if (startTime > currentTime) {
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);

    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      if (isHostTimeoutScheduled) {
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }

      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);

    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}
```

> 那么`requestHostCallback()`具体的执行逻辑是怎样的呢？是如何触发微前端的呢？返回`newTask`给`root.callbackNode = newCallbackNode(也就是newTask)`有什么作用呢？
>

## requestHostCallback()
从下面代码可以知道，我们一开始就会根据环境初始化`schedulePerformWorkUntilDeadline`的赋值，我们假设目前环境支持`MessageChannel`，如下面代码所示

```javascript
var schedulePerformWorkUntilDeadline;

if (typeof localSetImmediate === "function") {
  //...
} else if (typeof MessageChannel !== "undefined") {
  var channel = new MessageChannel();
  var port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;

  schedulePerformWorkUntilDeadline = function () {
    port.postMessage(null);
  };
} else {
  //...
}

function requestHostCallback(callback) {
  scheduledHostCallback = callback;

  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}
```

当我们触发`requestHostCallback()`时，也就是触发`post.postMessage()`，然后会触发`channel.port1.onmessage=performWorkUntilDeadline`



从下面代码可以知道，最终触发的是`scheduledHostCallback()`，也就是`requestHostCallback(callback)`传入的`callback`，从`2.4.2.4`可以知道，`requestHostCallback(flushWork)`，因此下面的`scheduledHostCallback()=flushWork()`

```javascript
var performWorkUntilDeadline = function () {
  if (scheduledHostCallback !== null) {
    var currentTime = getCurrentTime();
    startTime = currentTime;
    var hasTimeRemaining = true; // If a scheduler task throws, exit the current browser task so the
    var hasMoreWork = true;
    try {
      // hasMoreWork = flushWork(hasTimeRemaining, currentTime)
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
};
```

## flushWork()
从下面代码可以知道，有多个全局变量

+ `isHostCallbackScheduled`：用于控制`requestHostCallback`的调用频率，`flushWork()`执行后才能触发下一轮`requestHostCallback()`，也就是只有`port.postMessage`的消息送到了并且执行了回调函数，才能进行下一轮的`port.postMessage`
+ `isPerformingWork`：跟`isHostCallbackScheduled`一起控制`requestHostCallback`的调用频率，如下面`unstable_scheduleCallback()`代码所示，只有`!isHostCallbackScheduled && !isPerformingWork`才会触发`requestHostCallback()`进行微任务的调用

> 因此只有`port.postMessage`的消息送到了并且执行了回调函数，并且执行了`workLoop()`结束后，才能触发下一轮`requestHostCallback()`
>
> 当然在`workLoop()`还没执行完毕的过程中，可能会不断往`taskQueue`加入新的`task`，因此这里只是控制目前只有一个微任务在执行而已
>



+ `isHostTimeoutScheduled`：标记`requestHostTimeout()`是否已经执行，主要是进行`delay`任务类型的检测`setTimeout()`，如果当前已经启动`setTimeout()`检测，那么`isHostTimeoutScheduled=true`，此时已经触发`flushWork`（执行的是`taskQueue`的内容，没有精力给`timeQueue`的任务执行，因此先暂停`timeQueue`的任务检测）

> `taskQueue`存放的是正常的`update更新`的`task`，`timeQueue`存放的是带有延迟的`update更新`的`task`
>

```javascript
function flushWork(hasTimeRemaining, initialTime) {
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }
  isPerformingWork = true;
  var previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}
function unstable_scheduleCallback(...) {
  //...
  var newTask = {
    id: taskIdCounter++,
    callback: callback,
    priorityLevel: priorityLevel,
    startTime: startTime,
    expirationTime: expirationTime,
    sortIndex: -1,
  };
  //...
  push(taskQueue, newTask);
  //...
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback(flushWork);
  }
  return newTask;
}
```

> 在`flushWork()`中分析中，我们知道，主要核心代码就是触发`workLoop()`
>

## workLoop()
在分析`workLoop()`之前，我们先分析一个出现在`workLoop()`中出现很多次的方法`advanceTimers`



我们检测`timerQueue`栈顶的任务是否有任务已经到达延迟时间，如果已经到达延迟时间，则将它从`timerQueue`移入到`taskQueue`中，否则就什么都不执行

> 如果有一些任务已经被取消，该任务是废弃永远不会触发的任务，则从`timerQueue`中剔除
>

```javascript
function advanceTimers(currentTime) {
  // Check for tasks that are no longer delayed and add them to the queue.
  var timer = peek(timerQueue);

  while (timer !== null) {
    if (timer.callback === null) {
      // Timer was cancelled.
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // Timer fired. Transfer to the task queue.
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else {
      // Remaining timers are pending.
      return;
    }

    timer = peek(timerQueue);
  }
}
```

从下面`workLoop()`可以知道，整体代码非常多，但是逻辑其实非常简单

+ 从`taskQueue`中取出`task`，执行`task.callback`，如果返回`continuationCallback`，则更新`task.callback`=`continuationCallback`
+ 继续从`taskQueue`中取出`task`，直到`taskQueue`所有任务都执行完毕/目前没有时间执行：`!hasTimeRemaining || shouldYieldToHost()`
+ 然后判断当前是因为`taskQueue`所有任务都执行完毕还是因为时间不够
  - `taskQueue`所有任务都执行完毕，开始`requestHostTimeout()`检测`timerQueue`的倒计时，返回`false`
  - `taskQueue`所有任务还没执行完毕，直接返回`true`

> 在整个`workLoop()`的执行过程，会不断调用`advanceTimers()`检测是否能将`timerQueue`的任务放入到`taskQueue`
>

```javascript
function workLoop(hasTimeRemaining, initialTime) {
  var currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);

  while (currentTask !== null) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // 任务还没过期，并且已经没有时间给workLoop，则直接中断workLoop()执行
      break;
    }

    var callback = currentTask.callback;
    currentTask.callback = null;
    var didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
    var continuationCallback = callback(didUserCallbackTimeout);
    currentTime = getCurrentTime();

    if (typeof continuationCallback === "function") {
      // 如果continuationCallback还存在
      currentTask.callback = continuationCallback;
    } else {
      // 如果continuationCallback不允许，从taskQueue中剔除task
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue);
      }
    }
    advanceTimers(currentTime);
    currentTask = peek(taskQueue);
  }
  if (currentTask !== null) {
    // 如果taskQueue还没执行完毕
    return true;
  } else {
    // 如果taskQueue的任务已经执行完毕，尝试执行timerQueue
    var firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}
```

# performConcurrentWorkOnRoot()-task.callback具体执行方法
从下面代码，我们主要分为几块内容：

+ `flushPassiveEffects()`执行`effect`？？？？？后面再继续分析
+ `shouldTimeSlice`的判断：是否可以进行时间切片，如果可以则触发`renderRootConcurrent()`，否则触发`renderRootSync()`
+ 检测`render`是否已经执行完毕，如果没有则再次出发`renderRootSync()`
+ 如果`render`已经执行完毕，则触发`commit阶段`，触发`finishConcurrentRender`，通过一系列复杂逻辑处理后，通过`root.callbackNode === originalCallbackNode`来判断是否已经完全执行完毕，如果没有，则返回`continuationCallback`，然后`currentTask.callback = continuationCallback`
+ 当然执行完毕了，会触发`ensureRootIsScheduled()`：从`lanes`取出下一个`lane`的`task`创建以及`requestHostCallback()`触发微任务

> 如果此时`taskQueue`还有很多任务，那么`workLoop()`就还是会继续执行，那么`isPerformingWork = false`，`requestHostCallback()`就不会再次触发，因此`ensureRootIsScheduled()`只会触发从`lanes`取出下一个优先级最高`lane`进行`task`创建，然后放入到`taskQueue`
>
> 当然这个`task`有可能优先级较高，放在`taskQueue`栈顶，然后被`workLoop()`取出执行：`currentTask = peek(taskQueue)`
>

```javascript
function performConcurrentWorkOnRoot(root, didTimeout) {
  var originalCallbackNode = root.callbackNode;
  var didFlushPassiveEffects = flushPassiveEffects();
  if (didFlushPassiveEffects) {
    // effect的cleanup()函数可能会取消当前task
    // root.callbackNode改变则说明已经取消
    if (root.callbackNode !== originalCallbackNode) {
      return null;
    }
  }

  //...
  var shouldTimeSlice =
    !includesBlockingLane(root, lanes) &&
    !includesExpiredLane(root, lanes) &&
    !didTimeout;
  var exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  if (exitStatus !== RootInProgress) {
    //...检测是否可能还没render完毕
    var renderWasConcurrent = !includesBlockingLane(root, lanes);
    var finishedWork = root.current.alternate;
    if (
      renderWasConcurrent &&
      !isRenderConsistentWithExternalStores(finishedWork)
    ) {
      exitStatus = renderRootSync(root, lanes);
    }

    // commit阶段
    var finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    finishConcurrentRender(root, exitStatus, lanes);
  }

  // 从lanes取出下一个lane的task创建以及requestHostCallback触发微任务
  ensureRootIsScheduled(root, now());

  if (root.callbackNode === originalCallbackNode) {
    // 当前root.callbackNode仍然没有改变，因此这个任务还没完全执行完毕
    // 正常finishConcurrentRender()阶段会将root.callbackNode=null
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}
```

> shouldTimeSlice的计算依赖于`includesBlockingLane()`和`includesExpiredLane()`，那么这两个函数执行了什么逻辑呢？
>

## shouldTimeSlice
`SyncDefaultLanes`代表优先级非常高的`lane`，不能进行切片慢慢执行，`BlockingLane`=`InputContinuousHydrationLane` | `InputContinuousLane` | `DefaultHydrationLane` | `DefaultLane`



`root.expiredLanes`代表处于饥饿状态的`lane`(比如一直被高优先级抢占的低优先级`lane`)，需要马上执行，不能进行时间切片

```javascript
function includesBlockingLane(root, lanes) {
  var SyncDefaultLanes =
    InputContinuousHydrationLane |
    InputContinuousLane |
    DefaultHydrationLane |
    DefaultLane;
  return (lanes & SyncDefaultLanes) !== NoLanes;
}
function includesExpiredLane(root, lanes) {
  // This is a separate check from includesBlockingLane because a lane can
  // expire after a render has already started.
  return (lanes & root.expiredLanes) !== NoLanes;
}
```

## renderRootSync()
由于这小节内容较多，我们移入到`3.6`进行具体的分析

## finishConcurrentRender()
由于这小节内容较多，我们移入到`3.7`进行具体的分析

# renderRootSync()
初次渲染时，`workInProgressRoot`初始值为`null`, `workInProgressRootRenderLanes`的初始值为`NoLanes = 0`，因此会触发`prepareFreshStack()`进行一些准备工作，然后触发核心方法

+ `workLoopSync()` 也就是`performUnitOfWork()`

```javascript
function renderRootSync(root, lanes) {
  var prevExecutionContext = executionContext;
  executionContext |= RenderContext;

  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    //...
    workInProgressTransitions = getTransitionsForLanes(); // enableTransitionTracing=false，返回null
    prepareFreshStack(root, lanes);
  }

  do {
    workLoopSync();
    break;
  } while (true);

  executionContext = prevExecutionContext;

  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  return workInProgressRootExitStatus;
}
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

## prepareFreshStack
从下面可以知道，主要触发

+ `rootWorkInProgress = createWorkInProgress(root.current)`根据当前`rootFiber`创建一个新的`fiber`，赋值给全局变量`workInProgressRoot`
+ 进行其它多个全局变量，如`workInProgressRootRenderLanes`、`workInProgress`等等
+ 触发`finishQueueingConcurrentUpdates()`处理`concurrentQueues`全局变量，构建`concurrentQueues`中所有`update`成为一个链表结构

最终返回目前创建的`fiber`：`rootWorkInProgress`（就是全局变量`workInProgressRoot`）

```javascript
function prepareFreshStack(root, lanes) {
  //...
  workInProgressRoot = root;
  var rootWorkInProgress = createWorkInProgress(root.current, null);
  workInProgress = rootWorkInProgress;
  workInProgressRootRenderLanes = subtreeRenderLanes = workInProgressRootIncludedLanes = lanes;
  //...
  finishQueueingConcurrentUpdates();
  return rootWorkInProgress;
}
```

### createWorkInProgress()
如下面代码所示，就是利用当前`rootFiber`创建一个新的`fiber`

> 注意`workInProgress.alternate = current`和`current.alternate = workInProgress`，并不是直接复用旧的`fiber Root`，而是根据`current`新建一个`fiber Root`
>

```javascript
function createWorkInProgress(current, pendingProps) {
  var workInProgress = current.alternate;
  if (workInProgress === null) {
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    //...
  }
  //...workInProgress各种根据current赋值
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;
  //...
  return workInProgress;
}
```

### finishQueueingConcurrentUpdates()
将`concurrentQueues`的内容拿出来(包括`queue`、`fiber`、`lane`、`update`)，形成一个链表结构，然后调用`markUpdateLaneFromFiberToRoot()`更新`lanes`以及将`children`的`lane`都更新到`fiber.childrenLanes`中（为后面diff做准备，可以知道哪些`child`可以跳过更新）

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
        // This is the first update. Create a circular list.
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

> 经过`prepreFreshStatck()`？？？这个方法到底实现了什么？然后触发`workLoopSync()`
>

## workLoopSync()->performUnitOfWork()
从下面代码可以知道，`renderRootSync()`核心就是触发`workLoopSync()`->`performUnitOfWork()`，因此我们主要分析`performUnitOfWork()`即可

```javascript
function workLoopSync() {
    // Already timed out, so perform work without checking if we need to yield.
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}
function performUnitOfWork(unitOfWork) {
  var current = unitOfWork.alternate;
  var next;
  //...
  next = beginWork(current, unitOfWork, subtreeRenderLanes);

  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next === null) {
    // If this doesn't spawn new work, complete the current work.
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
  //...
}
```

上面代码融合起来就是：

```javascript
function workLoopSync() {
  while (workInProgress !== null) {
    var current = unitOfWork.alternate;
    var next;
    //...
    next = beginWork(current, unitOfWork, subtreeRenderLanes);

    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
      // If this doesn't spawn new work, complete the current work.
      completeUnitOfWork(unitOfWork);
    } else {
      workInProgress = next;
    }
    //...
  }
}
```

上面代码逻辑极其简单，就是触发`beginWork()`和`completeUnitOfWork()`



> 从源码上的名称，我们可以知道，`beginWork()`拿到的就下一个`unitOfWork`（根据react源码未打包版本，就是一个`Fiber`），那么`beginWork()`和`completeUnitOfWork()`的执行顺序是怎样的呢？
>

如下图所示，从调试代码打印的信息可以知道，`beginWork()`和`completeUnitOfWork()`的执行顺序是一个深度优先遍历（神似二叉树的后序遍历）

![](https://cdn.nlark.com/yuque/0/2024/png/35006532/1719675681230-3d986ac2-0374-4bb1-8d0d-565e977bb824.png)

> `beginWork()`和`completeUnitOfWork()`的执行顺序在代码中是如何实现的呢？
>

```javascript
function workLoopSync() {
  while (workInProgress !== null) {
    var current = unitOfWork.alternate;
    var next;
    //...
    next = beginWork(current, unitOfWork, subtreeRenderLanes);

    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
      // If this doesn't spawn new work, complete the current work.
      completeUnitOfWork(unitOfWork);
    } else {
      workInProgress = next;
    }
    //...
  }
}
function completeUnitOfWork(unitOfWork) {
  var completedWork = unitOfWork;
  do {
    var current = completedWork.alternate;
    var returnFiber = completedWork.return;

    var next = completeWork(current, completedWork, subtreeRenderLanes);
    if (next !== null) {
      workInProgress = next;
      return;
    }
    var siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}
```

上面的代码看起来很多，其实总结起来就是：

![](https://cdn.nlark.com/yuque/0/2024/svg/35006532/1720158868386-73f9bb34-a0f9-4182-aca7-e8c8a1847cbd.svg)

### [build-your-own-react](https://pomb.us/build-your-own-react/)分析对比
由于`beginWork()`和`completeWork()`章节内容较多，并且不容易理解，因此我们这里需要借助下其它文章[React初探-构建最小化的React](https://github.com/wbccb/mini-react/blob/main/docs/1-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86%26%E5%8E%9F%E7%90%86%E5%88%9D%E6%8E%A2/0-(WIP)React%E5%88%9D%E6%8E%A2-%E6%9E%84%E5%BB%BA%E6%9C%80%E5%B0%8F%E5%8C%96%E7%9A%84React.md)文章分析一波，可以有助于我们更好理解`beginWork()`和`completeWork()`的流程，如下面流程图所示，我们可以简单对比下（可能部分细节不太准确，但是大体方向是对的）：

+ `React18`的`beginWork()`其实就是下图`performUnitOfWork()`中的`createDom()`和`reconcileChildren()`，用户操作后会形成新的`fiber`树，新的`fiber`树会比较旧的`fiber`树，看看哪些`DOM`可以复用！因此会通过`reconcileChildren()`进行比较，如果可以复用，就进行复用旧的`fiber`树上`fiber`对应的`dom`；如果无法复用，则创建新的`dom`，最终形成一棵新的`fiber树(上面持有DOM，离屏DOM，还没挂载在<html>上，等待最终commit才挂载)`
+ `React18`的`completeWork()`其实就是下图`commitRoot()`，记住这个方法触发必须是完成`this.nextUnitOfWork`为空，也就是目前已经`performUnitOfWork()`已经执行完毕了，新的`fiber树`已经构建完成了，并且新的`fiber树`每一个`fiber`已经构建好真实`DOM`，在`commitRoot()`，就是从根节点开始，从根节点的真实`DOM`根据新的`fiber树`对应的关系开始组装`DOM`，比如`dom.appendChild()`、`dom.removeChild()`等等
  - 根据`effectTag`进行新增、替换、删除等真实`DOM`的操作
  - 如果遇到替换，直接更新旧的`fiber`树上`fiber`对应的`DOM`属性即可！
  - 然后递归调用`commit(fiber.child)`和`commit(fiber.sibling)`

![](https://cdn.nlark.com/yuque/0/2024/svg/35006532/1720062165723-bf4a521a-177c-4566-8056-fb6289801b6a.svg)

### beginWork()
初次渲染主要根据`workInProgress.tag`进行不同逻辑的调用，比如

+ `IndeterminateComponent`：函数组件`mount`时进入的分支
+ `FunctionComponent`：函数组件`update`时进入的分支
+ `ClassComponent`：类组件进入的分支
+ `HostComponent`：原生元素，比如`div`进入的分支

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes
      );
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    case FunctionComponent: {
      //...
    }
    case ClassComponent: {
      //....
    }
    //...
  }
}
```

### completeUnitOfWork->completeWork
`completeUnitOfWork()`就是一个深度遍历的非递归版本

```javascript
function completeUnitOfWork(unitOfWork) {
  var completedWork = unitOfWork;
  do {
    var current = completedWork.alternate;
    var returnFiber = completedWork.return;

    var next = completeWork(current, completedWork, subtreeRenderLanes);
    if (next !== null) {
      workInProgress = next;
      return;
    }
    var siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted;
  }
}
```

从下面的流程图我们可以知道，`completedWork()`类似于后序遍历，会从`child`->`child.sibling`->`parent`不断向上遍历

![](https://cdn.nlark.com/yuque/0/2024/svg/35006532/1720158859314-56aefcb8-01e9-4934-afde-1c5eebf90064.svg)

而`completeWork()`执行内容与`beginWork()`类似，都是根据`fiber.tag`进行不同方法的调用

```javascript
function completeWork(current, workInProgress, renderLanes) {
  var newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case ClassComponent: {
      bubbleProperties(workInProgress);
      return null;
    }
    case HostRoot: {
      //...
    }
    //...
  }
}
```

#### bubbleProperties()
通过`mergeLanes(_child.lanes, _child.childLanes)`，不断将`children`的`lanes`冒泡到`parent`

> 在遍历过程中，会不断将目前子节点的`lanes`和`flags`都合并到当前节点的`childLanes`和`subtreeFlags`，这样做的目的是当我们从`root`开始向下渲染时，我们不用深度遍历到某一个子节点，我们就能从某一个父节点知道子节点是否需要更新，以及是否存在`effect`需要处理！
>

```javascript
function bubbleProperties(completedWork) {
  var didBailout =
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;
  var newChildLanes = NoLanes;
  var subtreeFlags = NoFlags;
  //...
  if (!didBailout) {
    var _child = completedWork.child;
    while (_child !== null) {
      newChildLanes = mergeLanes(
        newChildLanes,
        mergeLanes(_child.lanes, _child.childLanes)
      );
      subtreeFlags |= _child.subtreeFlags;
      subtreeFlags |= _child.flags;
      
      _child.return = completedWork;
      _child = _child.sibling;
    }
    completedWork.subtreeFlags |= subtreeFlags;
  } else {
    //...
  }
  completedWork.childLanes = newChildLanes;
  return didBailout;
}
```

由于我们执行`completeWork()`是从`child`->`parent`，因此我们可以将所有`child fiber`的`lanes`、`childLanes`、`flags`、`subtreeFlags`都合并到`parent`对应的`childLanes`和`subtreeFlags`属性，这样我们可以直接通过判断`root`数据中的`childLanes`和`subtreeFlags`属性轻易得到`children`的一些属性，比如更新优先级、更新类型（删除、新增、替换），而不用每次都深度遍历才能知道`children`的一些属性

![](https://cdn.nlark.com/yuque/0/2024/png/35006532/1720350935198-2b3c71fa-bf3b-4c29-9d22-c1584994160c.png)

# finishConcurrentRender()
回到`3.5 performConcurrentWorkOnRoot()`的分析中，我们上面已经分析了`3.6 renderRootSync()`的`render阶段`，现在进入了`commit阶段`



主要核心代码为`root.finishedWork=root.current.alternate`和`finishConcurrentRender()`，如下面代码所示

```javascript
function performConcurrentWorkOnRoot(root, didTimeout) {
  //...
  var shouldTimeSlice =
    !includesBlockingLane(root, lanes) &&
    !includesExpiredLane(root, lanes) &&
    !didTimeout;
  var exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  // commit阶段
  var finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishedLanes = lanes;
  finishConcurrentRender(root, exitStatus, lanes);
  
  //...
}
```

`commit阶段`最终是提交`fiber Root`的复制`fiber`进行提交，然后触发`finishConcurrentRender()`方法，从而最终触发`commitRootImpl()`方法

```javascript
var finishedWork = root.current.alternate;
root.finishedWork = finishedWork;
root.finishedLanes = lanes;
finishConcurrentRender(root, exitStatus, lanes);

function finishConcurrentRender(root, exitStatus, lanes) {
  switch (exitStatus) {
    //...
    case RootCompleted: {
      commitRoot(root, workInProgressRootRecoverableErrors, workInProgressTransitions);
      break;
    }
  }
}
function commitRoot(root, recoverableErrors, transitions) {
  //...
  commitRootImpl(root, recoverableErrors, transitions, previousUpdateLanePriority);
}
```

而`commitRootImpl()`的核心代码如下所示：

+ 判断`subtreeHasEffects`（root元素的children存在`effect`）和`rootHasEffect`（root元素存在`effect`）然后调用
  - `commitBeforeMutationEffects()`
  - `commitMutationEffects()`
  - `commitLayoutEffects()`
+ 调用异步更新`ensureRootIsScheduled()`
+ 调用同步更新`flushSyncCallbacks()`

```javascript
function commitRootImpl(...) {
  //...
  var subtreeHasEffects =
    (finishedWork.subtreeFlags &
      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
    NoFlags;
  var rootHasEffect =
    (finishedWork.flags &
      (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
    NoFlags;

  if (subtreeHasEffects || rootHasEffect) {
    const prevExecutionContext = executionContext;
    executionContext |= CommitContext;
    commitBeforeMutationEffects(root, finishedWork);
    commitMutationEffects(root, finishedWork, lanes);
    commitLayoutEffects(finishedWork, root, lanes);

    executionContext = prevExecutionContext;
  } else {
    //...no effects
  }

  ensureRootIsScheduled(root, now());
  flushSyncCallbacks();
}
```

> 而`BeforeMutationMask`、`MutationMask`、`LayoutMask`、`PassiveMask`又代表什么意思呢？
>

## flags种类
```javascript
var BeforeMutationMask = Update | Snapshot;
var MutationMask = Placement | Update | ChildDeletion | ContentReset | Ref | Hydrating | Visibility;
var LayoutMask = Update | Callback | Ref | Visibility; 
var PassiveMask = Passive | ChildDeletion;
```

## commitBeforeMutationEffects()
从下面`commitBeforeMutationEffects()`代码我们可以知道，本质是深度优先遍历，我们从根`fiber`开始遍历，不停将`nextEffect`赋值给`fiber.child`，直到叶子`fiber`，然后触发`commitBeforeMutationEffects_complete()`

```javascript
function commitBeforeMutationEffects(root, firstChild) {
  //...
  nextEffect = firstChild;
  commitBeforeMutationEffects_begin();
}
function commitBeforeMutationEffects_begin() {
  while (nextEffect !== null) {
    var fiber = nextEffect;
    var child = fiber.child;
    if (
      (fiber.subtreeFlags & BeforeMutationMask) !== NoFlags &&
      child !== null
    ) {
      child.return = fiber;
      nextEffect = child;
    } else {
      commitBeforeMutationEffects_complete();
    }
  }
}
```

在`commitBeforeMutationEffects_complete()`中，我们调用

+ `commitBeforeMutationEffectsOnFiber(fiber)`
+ 然后寻找当前`fiber`的`sibling`，如果没有`sibling`，则将当前`nextEffect`移动到`fiber.return`，类似于二叉树的后序遍历，先处理所有`children`，然后再回到`parent`，然后继续触发`commitBeforeMutationEffectsOnFiber(fiber)`

```javascript
function commitBeforeMutationEffects_complete() {
  while (nextEffect !== null) {
    var fiber = nextEffect;
    commitBeforeMutationEffectsOnFiber(fiber);
    var sibling = fiber.sibling;

    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}
```

### commitBeforeMutationEffectsOnFiber()
> 处理`Snapshot`相关标记
>

在`commitBeforeMutationEffectsOnFiber()`的代码中，我们可以清晰看到，就是处理`fiber.flag`等于`Snapshot`相关的逻辑，涉及到`ClassComponent`和`HostText`两种类型

+ `ClassComponent`：调用`getSnapshotBeforeUpdate()`生命周期

> 如果你实现了 `getSnapshotBeforeUpdate`，React 会在 React 更新 DOM 之前时直接调用它。它使你的组件能够在 DOM 发生更改之前捕获一些信息（例如滚动的位置）。此生命周期方法返回的任何值都将作为参数传递给`componentDidUpdate`
>

+ `HostText`: 文本节点调用`clearContainer()`？？？清空？？？

```javascript
function commitBeforeMutationEffectsOnFiber(finishedWork) {
  var current = finishedWork.alternate;
  var flags = finishedWork.flags;

  if ((flags & Snapshot) !== NoFlags) {
    switch (finishedWork.tag) {
      case ClassComponent: {
        if (current !== null) {
          var prevProps = current.memoizedProps;
          var prevState = current.memoizedState;
          var instance = finishedWork.stateNode; // We could update instance props and state here,

          var snapshot = instance.getSnapshotBeforeUpdate(
            finishedWork.elementType === finishedWork.type
              ? prevProps
              : resolveDefaultProps(finishedWork.type, prevProps),
            prevState
          );

          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
        break;
      }
      case HostRoot: {
        var root = finishedWork.stateNode;
        clearContainer(root.containerInfo);
        break;
      }
    }
  }
}
```

## commitMutationEffects()
```javascript
function commitMutationEffects(root, finishedWork, committedLanes) {
  //...
  commitMutationEffectsOnFiber(finishedWork, root);
  //...
}
```

从下面代码可以知道，根据不同`fiber.tag`进行处理

+ 先调用`recursivelyTraverseMutationEffects()`
+ 再触发`commitReconciliationEffects()`
+ 最终根据不同`tag`触发不同的逻辑，主要涉及到`Update`、`Placement`、`Deletion`、`Ref`、`Hydrating`等多种标记的操作

```javascript
function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
    //...
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & Update) {
          commitHookEffectListUnmount(Insertion | HasEffect, ...);
          commitHookEffectListMount(Insertion | HasEffect, finishedWork);
          commitHookEffectListUnmount(Layout | HasEffect, ...);
        }
        return;
      }
      case ClassComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & Ref) {
          //...
        }
        return;
      }
      case HostComponent: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & Ref) {
         //...
        }
        if (finishedWork.flags & ContentReset) {
          //...
        }
        if (flags & Update) {
          //...
        }
        return;
      }
      case HostText: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & Update) {
          //...
        }
        return;
      }
      case HostRoot: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & Update) {
          //...
        }
        return;
      }
      case OffscreenComponent: {
        //...
      }
      //...还有多种类型
      default: {
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        return;
      }
    }
  }
```

### recursivelyTraverseMutationEffects()
在`commitMutationEffectsOnFiber()`中高频出现的`recursivelyTraverseMutationEffects()`是为了

+ 处理当前`fiber.deletions`，在`reconcileChildFibers()`中进行`fiber.deletions`数据的添加（也就是`fiber.children`中已经被移除的数据）
+ 然后触发`fiber.child`进行`commitMutationEffectsOnFiber()`=>`fiber.child`处理完成，就处理`fiber.child.sibling`，触发`commitMutationEffectsOnFiber()`

总结：处理`fiber.childrenDeletion`集合 + 往下遍历`fiber.child` + `fiber.child.sibling`进行递归调用`commitMutationEffectsOnFiber()`

> 由于内容较多，这个小节不会对`commitDeletionEffects()`进行详细分析
>

```javascript
function recursivelyTraverseMutationEffects(root, parentFiber, lanes) {
  var deletions = parentFiber.deletions;
  if (deletions !== null) {
    for (var i = 0; i < deletions.length; i++) {
      var childToDelete = deletions[i];
      commitDeletionEffects(root, parentFiber, childToDelete);
    }
  }
  // MutationMask = Placement | Update | ChildDeletion | ContentReset | Ref | Hydrating | Visibility;
  if (parentFiber.subtreeFlags & MutationMask) {
    var child = parentFiber.child;

    while (child !== null) {
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}
function ChildReconciler(shouldTrackSideEffects) {
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) {
      return;
    }
    var deletions = returnFiber.deletions;

    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }
}
```

### commitReconciliationEffects()
处理`Placement`和`Hydrating`相关更新，触发`commitPlacement()`

```javascript
function commitReconciliationEffects(finishedWork) {
  var flags = finishedWork.flags;
  if (flags & Placement) {
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }
  if (flags & Hydrating) {
    finishedWork.flags &= ~Hydrating;
  }
}
```

## commitLayoutEffects()
与`commitBeforeMuationEffects()`逻辑一致，先处理`children`->`children.sibling`->`parent`->`finishedWork`



实际执行方法还是`commitLayoutEffectOnFiber()`

> 注意：`fiber.subtreeFlags`代表的是它的所有深度层级`children`的`flags`集合！
>

```javascript
function commitLayoutEffects(finishedWork, root, committedLanes) {
  nextEffect = finishedWork;
  commitLayoutEffects_begin(finishedWork, root, committedLanes);
}
function commitLayoutEffects_begin(subtreeRoot, root, committedLanes) {
  while (nextEffect !== null) {
    var fiber = nextEffect;
    var firstChild = fiber.child;

    if ((fiber.subtreeFlags & LayoutMask) !== NoFlags && firstChild !== null) {
      firstChild.return = fiber;
      nextEffect = firstChild;
    } else {
      commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
    }
  }
}
function commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes) {
  while (nextEffect !== null) {
    var fiber = nextEffect;
    if ((fiber.flags & LayoutMask) !== NoFlags) {
      var current = fiber.alternate;
      commitLayoutEffectOnFiber(root, current, fiber, committedLanes);
    }
    if (fiber === subtreeRoot) {
        // commitLayoutEffects()>nextEffect=subtreeRoot，
        // 如果相等，则说明遍历到一开始的parent，已经全部都处理完毕了，因此是后序遍历，先处理children->parent
      nextEffect = null;
      return;
    }
    var sibling = fiber.sibling;
    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }
    nextEffect = fiber.return;
  }
}
```

### commitLayoutEffectOnFiber()
+ 处理`Update | Callback | Ref | Visibility`相关`flags`标记
+ 根据`fiber.tag`调用不同方法进行处理

> 我们将在下面`fiber.tag`具体展开分析调用了什么方法
>

```javascript
function commitLayoutEffectOnFiber(
  finishedRoot,
  current,
  finishedWork,
  committedLanes
) {
  // var LayoutMask = Update | Callback | Ref | Visibility;
  if ((finishedWork.flags & LayoutMask) !== NoFlags) {
    switch (finishedWork.tag) {
      case HostComponent:
      //...
    }
  }
}
```
