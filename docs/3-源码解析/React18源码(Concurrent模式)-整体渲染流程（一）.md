> 本文基于`React 18.2.0`版本进行分析

> 本文会集中分析`Concurrent`模式，顺带简单分析下`Legacy`模式，为了增加可读性，展示代码会剔除`SSR`相关代码和`Legacy`模式相关代码


# 文章内容

1. 使用一个具体的例子，进行首次渲染整体流程的流程图分析，然后根据流程图进行具体的源码分析
2. 使用一个具体的例子，进行渲染更新时流程的流程图分析，然后根据流程图进行具体的源码分析
3. 重点讲解`fiber`架构和`可中断渲染`
4. 重点讲解`事件切片time slicing`和`异步渲染suspense`
> 所有源码分析都是为流程图而展开，流程图是最核心的部分

# 1.前置知识
> 在源码分析的过程中，发现很多离散的知识点，比如`lane优先级`。在整体流程分析中，单独分析这些知识点会使得整个流程分析很碎片化，因此在此章节进行概述总结

## 1.1 lane模型
`lane`类型被定义为二进制变量, 利用了位掩码的特性, 在频繁运算的时候占用内存少, 计算速度快
> 位掩码（BitMask），是"位（Bit）"和"掩码（Mask）"的组合词。"位"指代着二进制数据当中的二进制位，而"掩码"指的是一串用于与目标数据进行按位操作的二进制数字。组合起来，就是"用一串二进制数字（掩码）去操作另一串二进制数字"的意思

```javascript
export const TotalLanes = 31;

export const NoLanes: Lanes = 0b0000000000000000000000000000000;
export const NoLane: Lane = 0b0000000000000000000000000000000;

export const SyncLane: Lane = 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = 0b0000000000000000000000000001000;
export const DefaultLane: Lane = 0b0000000000000000000000000010000;
//...
```
## 1.2 优先级
主要分为`EventPriority`、`PriorityLevel`和`Lane`三种优先级
### 1.2.1 scheduler具有优先级
优先级从高到低为：

- `ImmediatePriority`：同步优先级，这个优先级的调度需要马上同步执行
- `UserBlockingPriority`
- `NormalPriority`
- `LowPriority`
- `IdlePriority`
```javascript
export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const NoPriority = 0;
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;
```
### 1.2.2 lane具有优先级
```javascript
export const TotalLanes = 31;

export const NoLanes: Lanes = 0b0000000000000000000000000000000;
export const NoLane: Lane = 0b0000000000000000000000000000000;

export const SyncLane: Lane = 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = 0b0000000000000000000000000001000;
export const DefaultLane: Lane = 0b0000000000000000000000000010000;
//...
function getHighestPriorityLanes(lanes: Lanes | Lane): Lanes {
  switch (getHighestPriorityLane(lanes)) {
    case SyncLane:
      return SyncLane;
    case InputContinuousHydrationLane:
      return InputContinuousHydrationLane;
    //...
      return IdleLane;
    case OffscreenLane:
      return OffscreenLane;
    default:
      if (__DEV__) {
        console.error(
          'Should have found matching lanes. This is a bug in React.',
        );
      }
      // This shouldn't be reachable, but as a fallback, return the entire bitmask.
      return lanes;
  }
}
```
### 1.2.3 event具有优先级
根据事件划分的优先级从高到低分为：

- `DiscreteEventPriority`: click、touchend等一次性的用户触发事件
- `ContinuousEventPriority`: drag、pointerleave等持续性的用户触发事件
- `DefaultEventPriority`: 默认的优先级，比如通过`setTimeout()`回调触发的非交互产生的事件
- `IdleEventPriority`: 空闲情况的优先级
```javascript
var DiscreteEventPriority = SyncLane;
var ContinuousEventPriority = InputContinuousLane;
var DefaultEventPriority = DefaultLane;
var IdleEventPriority = IdleLane;
var currentUpdatePriority = NoLane;

function getEventPriority(domEventName) {
    switch (domEventName) {
        case 'click':
        case 'touchend':
        case 'touchstart':
            //...
            return DiscreteEventPriority;

        case 'drag':
        case 'dragenter':
        case 'dragexit':
        case 'pointerleave':
            return ContinuousEventPriority;
    }
}
```
### 1.2.4 优先级之间的转化
`schedulerPriority`转化为`EventPriority`
```javascript
var schedulerPriority = getCurrentPriorityLevel();
switch (schedulerPriority) {
  case ImmediatePriority:
    return DiscreteEventPriority;

  case UserBlockingPriority:
    return ContinuousEventPriority;

  case NormalPriority:
  case LowPriority:
    // TODO: Handle LowSchedulerPriority, somehow. Maybe the same lane as hydration.
    return DefaultEventPriority;

  case IdlePriority:
    return IdleEventPriority;

  default:
    return DefaultEventPriority;
}
```
## 1.3 二进制标记状态
### 1.3.1 executionContext
用来标记`React不同的运行阶段`，主要有

- `CommitContext`: `commit`阶段
- `BatchedContext`: 批量更新
- `RenderContext`: `render`阶段
- `CommitContext`: `commit`阶段
### 1.3.2 模式
标记目前处于同步模式、并发模式还是其它模式，会影响渲染更新逻辑所触发的方法
```javascript
export type TypeOfMode = number;

export const NoMode =  0b000000;
// TODO: Remove ConcurrentMode by reading from the root tag instead
export const ConcurrentMode = 0b000001;
export const ProfileMode = 0b000010;
export const DebugTracingMode = 0b000100;
export const StrictLegacyMode = 0b001000;
export const StrictEffectsMode = 0b010000;
export const ConcurrentUpdatesByDefaultMode = 0b100000;
```
### 1.3.3 workInProgressRootRenderLanes

## 1.4 常用位运算方法
## 1.5 重要的变量

- `workInProgress`：当前正在构建的`fiber`节点
- `current`：当前页面正在使用的`fiber`，`current = workInProgress.alternate`，初次构建时，页面还没渲染，此时`current = null`
- `fiber.memoizedState`：
# 2.首次渲染（Concurrent模式）
## 2.1 示例代码
```javascript
const App = function () {
    const [testValue, setTestValue] = React.useState("11");
    return (
        <div>
            <span>测试</span>
            <input value={testValue} onChange={(event) => setTestValue(event.target.value)}/>
        </div>
    );
}
const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
);
```
## 2.2 整体流程图

> 接下来我们将根据流程图进行具体的源码分析

## 2.3 ReactDOM.createRoot
`createRoot()`的代码逻辑也比较简单，主要是触发

- `createContainer()`: 传入`ConcurrentRoot`进行`root`的初始化
- `markContainerAsRoot`:  将上面初始化的`FiberRootNode`对象绑定在`DOM元素`的`internalContainerInstanceKey`属性上
- `listenToAllSupportedEvents`: 为`rootDOM`注册所有支持的事件监听
- 最终返回`ReactDOMRoot`对象，将当前创建的`root`放入到`_internalRoot`属性中
```javascript
function createRoot(container, options) {
    //...
    var root = createContainer(container, ConcurrentRoot, ...);
    markContainerAsRoot(root.current, container);
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
    listenToAllSupportedEvents(rootContainerElement);
    return new ReactDOMRoot(root);
}
function markContainerAsRoot(hostRoot, node) {
  node[internalContainerInstanceKey] = hostRoot;
}
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}
```
### 1.3.1 createContainer
从下面代码可以知道，主要触发了

- `new FiberRootNode()`: 进行`new FiberRootNode()`，TypeScript类型为`FiberRoot`
- `createHostRootFiber()`: 进行`new FiberNode()`对象，TypeScript类型为`Fiber`
- 将`FiberRootNode对象`和`FiberNode对象(Fiber Root)`进行互相绑定
- 初始化`FiberNode对象(Fiber Root).updateQueue`

返回`FiberRootNode`对象
```javascript
function createContainer(...) {
    return createFiberRoot(...);
}
function createFiberRoot(...) {
    var root = new FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onRecoverableError); //FiberRoot
    var uninitializedFiber = createHostRootFiber(tag, isStrictMode); //Fiber
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;
    initializeUpdateQueue(uninitializedFiber);
    return root;
}
function createHostRootFiber(...) {
    return createFiber(HostRoot, null, null, mode);
}
var createFiber = function (tag, pendingProps, key, mode) {
    return new FiberNode(tag, pendingProps, key, mode);
};
function initializeUpdateQueue(fiber) {
    var queue = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: {
            pending: null,
            interleaved: null,
            lanes: NoLanes
        },
        effects: null
    };
    fiber.updateQueue = queue;
}
```
### 1.3.2 markContainerAsRoot
> 此时的`node`=`div#root`

将上面初始化的`FiberRootNode`对象绑定在`DOM元素`的`internalContainerInstanceKey`属性上，把dom和fiber对象关联起来
```javascript
function markContainerAsRoot(hostRoot, node) {
  // var internalContainerInstanceKey = '__reactContainer$' + randomKey;
  node[internalContainerInstanceKey] = hostRoot;
}
```
### 1.3.3 listenToAllSupportedEvents
`allNativeEvents`包含了所有原生的事件方法，包括`"mousemove"`、`"dblclick"`等等
```javascript
function listenToAllSupportedEvents(rootContainerElement) {
    allNativeEvents.forEach(function (domEventName) {
        //...
        listenToNativeEvent(domEventName, true, rootContainerElement);
    });
}
function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
}
function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener, isDeferredListenerForLegacyFBSupport) {
    //...
    if (isCapturePhaseListener) {
        if (isPassiveListener !== undefined) {
            unsubscribeListener = addEventCaptureListenerWithPassiveFlag(targetContainer, domEventName, listener, isPassiveListener);
        } else {
            unsubscribeListener = addEventCaptureListener(targetContainer, domEventName, listener);
        }
    } else {
        //...
    }
}
```
经过一系列的逻辑处理，`listenToAllSupportedEvents`最终触发也是原生的`target.addEventListener(eventType)`，也就是为`rootDOM`注册所有支持的事件监听
```javascript
function addEventCaptureListenerWithPassiveFlag(target, eventType, listener, passive) {
    target.addEventListener(eventType, listener, {
        capture: true,
        passive: passive
    });
    return listener;
}
function addEventCaptureListener(target, eventType, listener) {
    target.addEventListener(eventType, listener, true);
    return listener;
}
```
## 2.4 ReactDOM.createRoot().render()
我们在上面`ReactDOM.createRoot()`的分析可以知道，最终会返回`new ReactDOMRoot()`对象，然后触发对应的`render()`方法，本质也是触发`updateContainer()`方法
```javascript
function createRoot(container, options) {
    //...
    var root = createContainer(...);
    markContainerAsRoot(root.current, container);
    var rootContainerElement = container.nodeType === COMMENT_NODE ? container.parentNode : container;
    listenToAllSupportedEvents(rootContainerElement);
    return new ReactDOMRoot(root);
}
ReactDOMRoot.prototype.render = function (children) {
  var root = this._internalRoot;
  updateContainer(children, root, null, null);
};
```
```javascript
function updateContainer(element, container, parentComponent, callback) {
    var current = container.current;
    var eventTime = requestEventTime();
    var lane = requestUpdateLane(current);
    markRenderScheduled(lane);

    var context = getContextForSubtree(parentComponent);
    if (container.context === null) {
        container.context = context;
    } else {
        container.pendingContext = context;
    }

    var update = createUpdate(eventTime, lane);
    update.payload = {
        element: element
    };
    callback = callback === undefined ? null : callback;
    if (callback !== null) {
        update.callback = callback;
    }

    var root = enqueueUpdate(current, update, lane);
    if (root !== null) {
        scheduleUpdateOnFiber(root, current, lane, eventTime);
        entangleTransitions(root, current, lane);
    }
    return lane;
}
```
### 1.4.1 requestUpdateLane
```javascript
function requestUpdateLane(fiber) {
    var mode = fiber.mode;

    if ((mode & ConcurrentMode) === NoMode) {
        return SyncLane;
    } else if ((executionContext & RenderContext) !== NoContext && workInProgressRootRenderLanes !== NoLanes) {
        return pickArbitraryLane(workInProgressRootRenderLanes);
    }

    var isTransition = requestCurrentTransition() !== NoTransition;
    if (isTransition) {
        if (currentEventTransitionLane === NoLane) {
            currentEventTransitionLane = claimNextTransitionLane();
        }
        return currentEventTransitionLane;
    }

    var updateLane = getCurrentUpdatePriority();
    if (updateLane !== NoLane) {
        return updateLane;
    }
    var eventLane = getCurrentEventPriority();
    return eventLane;
}
```
### 1.4.2 markRenderScheduled
```javascript
function markRenderScheduled(lane) {
    if (injectedProfilingHooks !== null 
        && typeof injectedProfilingHooks.markRenderScheduled === 'function') {
        injectedProfilingHooks.markRenderScheduled(lane);
    }
}
```
### 1.4.3 getContextForSubtree
```javascript
function getContextForSubtree(parentComponent) {
    if (!parentComponent) {
        return emptyContextObject;
    }

    var fiber = get(parentComponent);
    var parentContext = findCurrentUnmaskedContext(fiber);

    if (fiber.tag === ClassComponent) {
        var Component = fiber.type;

        if (isContextProvider(Component)) {
            return processChildContext(fiber, Component, parentContext);
        }
    }

    return parentContext;
}

function processChildContext(fiber, type, parentContext) {
    var instance = fiber.stateNode;
    var childContextTypes = type.childContextTypes; 

    if (typeof instance.getChildContext !== 'function') {
        return parentContext;
    }

    var childContext = instance.getChildContext();
    for (var contextKey in childContext) {
        if (!(contextKey in childContextTypes)) {
            throw new Error((getComponentNameFromFiber(fiber) || 'Unknown') + ".getChildContext(): key \"" + contextKey + "\" is not defined in childContextTypes.");
        }
    }

    return assign({}, parentContext, childContext);
}
```
### 1.4.4 createUpdate
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
### 1.4.5 enqueueUpdate
```javascript
function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;

    if (updateQueue === null) {
        return null;
    }

    var sharedQueue = updateQueue.shared;
    if (isUnsafeClassRenderPhaseUpdate()) {
        var pending = sharedQueue.pending;
        if (pending === null) {
            update.next = update;
        } else {
            update.next = pending.next;
            pending.next = update;
        }
        sharedQueue.pending = update; 
        return unsafe_markUpdateLaneFromFiberToRoot(fiber, lane);
    } else {
        return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane);
    }
}
```
### 1.4.6 scheduleUpdateOnFiber
```javascript
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    markRootUpdated(root, lane, eventTime);

    if (isDevToolsPresent) {
        addFiberToLanesMap(root, fiber, lane);
    }

    if (root === workInProgressRoot) {
        if ((executionContext & RenderContext) === NoContext) {
            workInProgressRootInterleavedUpdatedLanes = mergeLanes(workInProgressRootInterleavedUpdatedLanes, lane);
        }

        if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
            markRootSuspended$1(root, workInProgressRootRenderLanes);
        }
    }

    ensureRootIsScheduled(root, eventTime);

    if (lane === SyncLane && executionContext === NoContext && (fiber.mode & ConcurrentMode) === NoMode) {
        resetRenderTimer();
        flushSyncCallbacksOnlyInLegacyMode();
    }
}
```
### 1.4.7 entangleTransitions
```javascript
function entangleTransitions(root, fiber, lane) {
    var updateQueue = fiber.updateQueue;

    if (updateQueue === null) {
        return;
    }

    var sharedQueue = updateQueue.shared;

    if (isTransitionLane(lane)) {
        var queueLanes = sharedQueue.lanes;
        queueLanes = intersectLanes(queueLanes, root.pendingLanes);
        var newQueueLanes = mergeLanes(queueLanes, lane);
        sharedQueue.lanes = newQueueLanes;
        markRootEntangled(root, newQueueLanes);
    }
}
function markRootEntangled(root, entangledLanes) {
    var rootEntangledLanes = root.entangledLanes |= entangledLanes;
    var entanglements = root.entanglements;
    var lanes = rootEntangledLanes;

    while (lanes) {
        var index = pickArbitraryLaneIndex(lanes);
        var lane = 1 << index;

        if (lane & entangledLanes | entanglements[index] & entangledLanes) {
            entanglements[index] |= entangledLanes;
        }
        lanes &= ~lane;
    }
}

```


> 由于`scheduleUpdateOnFiber()`的代码逻辑较为重要和复杂，我们将着重分析`scheduleUpdateOnFiber()`

## 2.5 scheduleUpdateOnFiber重要方法
```javascript
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    markRootUpdated(root, lane, eventTime);

    if (isDevToolsPresent) {
        addFiberToLanesMap(root, fiber, lane);
    }

    if (root === workInProgressRoot) {
        if ((executionContext & RenderContext) === NoContext) {
            workInProgressRootInterleavedUpdatedLanes = mergeLanes(workInProgressRootInterleavedUpdatedLanes, lane);
        }

        if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
            markRootSuspended$1(root, workInProgressRootRenderLanes);
        }
    }

    ensureRootIsScheduled(root, eventTime);

    if (lane === SyncLane && executionContext === NoContext && (fiber.mode & ConcurrentMode) === NoMode) {
        resetRenderTimer();
        flushSyncCallbacksOnlyInLegacyMode();
    }
}
```
### 2.5.1 markRootUpdated
### 2.5.2 ensureRootIsScheduled
```javascript
function ensureRootIsScheduled(root, currentTime) {
    var schedulerPriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
        case DiscreteEventPriority:
            schedulerPriorityLevel = ImmediatePriority;
            break;
        case ContinuousEventPriority:
            schedulerPriorityLevel = UserBlockingPriority;
            break;
        case DefaultEventPriority:
            schedulerPriorityLevel = NormalPriority;
            break;
        case IdleEventPriority:
            schedulerPriorityLevel = IdlePriority;
            break;
        default:
            schedulerPriorityLevel = NormalPriority;
            break;
    }
    newCallbackNode = scheduleCallback$2(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root));

    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
}

```
从下面的代码中，我们可以知道，主要进行两个部分的逻辑：

- `push(taskQueue, newTask)`：`taskQueue`添加新的`task`，在下面的`workLoop()`进行`task`的循环处理，注意此时的`task.callback`就是`performConcurrentWorkOnRoot`
- `requestHostCallback(flushWork)`：注册`scheduledHostCallback=flushWork()`，然后触发`schedulePerformWorkUntilDeadline()`
```javascript
function unstable_scheduleCallback(priorityLevel, callback, options) {
    //...
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
    var expirationTime = startTime + timeout;
    var newTask = {
        id: taskIdCounter++,
        callback: callback,
        priorityLevel: priorityLevel,
        startTime: startTime,
        expirationTime: expirationTime,
        sortIndex: -1
    };
    push(taskQueue, newTask);

    requestHostCallback(flushWork);
    //...
    return newTask;
}
function requestHostCallback(callback) {
    scheduledHostCallback = callback;

    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
    }
}
```
#### 2.5.2.1 schedulePerformWorkUntilDeadline()
而`schedulePerformWorkUntilDeadline()`本质就是根据不同环境进行宏任务的模拟，优先级为

- `setImmediate`
- `MessageChannel`
- `setTimeout`
```javascript
var localSetImmediate = typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom
var localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
var schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
    schedulePerformWorkUntilDeadline = function () {
        localSetImmediate(performWorkUntilDeadline);
    };
} else if (typeof MessageChannel !== 'undefined') {
    var channel = new MessageChannel();
    var port = channel.port2;
    channel.port1.onmessage = performWorkUntilDeadline;

    schedulePerformWorkUntilDeadline = function () {
        port.postMessage(null);
    };
} else {
    schedulePerformWorkUntilDeadline = function () {
        localSetTimeout(performWorkUntilDeadline, 0);
    };
}
```
最终宏任务触发`performWorkUntilDeadline()`的执行，会不断判断`scheduledHostCallback()`执行完成后还存不存在任务，如果还有任务则继续调用`performWorkUntilDeadline()`的执行
#### 2.5.2.2 performWorkUntilDeadline()
而`scheduledHostCallback()`在上面的分析中，我们知道`scheduledHostCallback=flushWork`
```javascript
var performWorkUntilDeadline = function () {
    if (scheduledHostCallback !== null) {
        var currentTime = getCurrentTime(); // Keep track of the start time so we can measure how long the main thread
        startTime = currentTime;
        var hasTimeRemaining = true; // If a scheduler task throws, exit the current browser task so the
        var hasMoreWork = true;
        try {
            hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
        } finally {
            if (hasMoreWork) {
                // If there's more work, schedule the next message event at the end
                // of the preceding one.
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
#### 2.5.2.3 flushWork()
```javascript
function flushWork(hasTimeRemaining, initialTime) {
    return workLoop(hasTimeRemaining, initialTime);
}
```
#### 2.5.2.4 workLoop()
> `workLoop()`的具体代码直接看会比较难懂，我们先看看之前[(WIP)React初探-构建最小化的React](https://github.com/wbccb/mini-react/blob/main/docs/1-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86%26%E5%8E%9F%E7%90%86%E5%88%9D%E6%8E%A2/0-(WIP)React%E5%88%9D%E6%8E%A2-%E6%9E%84%E5%BB%BA%E6%9C%80%E5%B0%8F%E5%8C%96%E7%9A%84React.md)中`workLoop()`的简单实现

1. 一开始使用`requestIdleCallback(workLoop)`等待浏览器有空闲时间
2. 在`workLoop()`中，主要检测浏览器这一帧是否有剩余时间，如果有剩余时间，则触发任务执行，如果没有，则再次使用`requestIdleCallback(workLoop)`等待浏览器有空闲时间
3. 在`performUnitOfWork()`中执行每一个unit任务，然后返回下一个unit任务
```javascript
let nextUnitOfWork = null;

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }
    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop);

function performUnitOfWork(nextUnitOfWork) {
    // TODO
}
```

---

> 回到`React 18.2.0`的代码中，我们就可以轻易明白`workLoop()`的逻辑

从下面的代码块，会不断拿出`taskQueue`的`task`进行处理

- 检测浏览器这一帧是否有剩余时间
- 如果有剩余时间，则拿出`currentTask.callback`，如果存在，则执行并且返回`continuationCallback`，等待后续有空闲时间继续执行`continuationCallback`（可中断渲染）
- 然后不断取出`taskQueue`的`task`进行处理
> 我们在上面的`ensureRootIsScheduled`流程的分析中知道，初始化流程会传入`currentTask.callback`=`performConcurrentWorkOnRoot`，因此会执行`performConcurrentWorkOnRoot()`，由于这个方法比较复杂，我们将放在`2.6`中进行着重分析

```javascript
function workLoop(hasTimeRemaining, initialTime) {
    var currentTime = initialTime;
    advanceTimers(currentTime);
    currentTask = peek(taskQueue);

    while (currentTask !== null && !(enableSchedulerDebugging)) {
        if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
            // 如果没有空闲时间，则中断处理
            break;
        }

        var callback = currentTask.callback;

        if (typeof callback === 'function') {
            currentTask.callback = null;
            currentPriorityLevel = currentTask.priorityLevel;
            var didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

            var continuationCallback = callback(didUserCallbackTimeout);
            currentTime = getCurrentTime();

            if (typeof continuationCallback === 'function') {
                currentTask.callback = continuationCallback;
            } else {

                if (currentTask === peek(taskQueue)) {
                    pop(taskQueue);
                }
            }

            advanceTimers(currentTime);
        } else {
            pop(taskQueue);
        }

        currentTask = peek(taskQueue);
    }

    if (currentTask !== null) {
        return true;
    } else {
        var firstTimer = peek(timerQueue);
        if (firstTimer !== null) {
            requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
        return false;
    }
}
```
#### 2.5.2.5 requestHostTimeout
使用`setTimeout`延迟执行`handleTimeout()`，也就是`performWorkUntilDeadline()`->`flushWork()`->`workLoop()`，然后继续执行`taskQueu`的`task`任务
```javascript
function requestHostTimeout(callback, ms) {
    taskTimeoutID = localSetTimeout(function () {
        callback(getCurrentTime());
    }, ms);
}
function handleTimeout(currentTime) {
    isHostTimeoutScheduled = false;
    advanceTimers(currentTime);

    if (!isHostCallbackScheduled) {
        if (peek(taskQueue) !== null) {
            isHostCallbackScheduled = true;
            requestHostCallback(flushWork);
        } else {
            var firstTimer = peek(timerQueue);

            if (firstTimer !== null) {
                requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
            }
        }
    }
}
function requestHostCallback(callback) {
    scheduledHostCallback = callback;
    if (!isMessageLoopRunning) {
        isMessageLoopRunning = true;
        schedulePerformWorkUntilDeadline();
    }
}
```
### 2.5.3 检测是否是NoMode，执行同步逻辑
检测目前是否是同步模式，如果是则执行`flushSyncCallbacksOnlyInLegacyMode()`方法
> 并不是初始化设置了并发模式就会一直使用并发模式，在源码注释有说明存在一些特殊的情况还是会切换回来同步模式

```javascript
function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
    markRootUpdated(root, lane, eventTime);

    if (isDevToolsPresent) {
        addFiberToLanesMap(root, fiber, lane);
    }

    if (root === workInProgressRoot) {
        if ((executionContext & RenderContext) === NoContext) {
            workInProgressRootInterleavedUpdatedLanes = mergeLanes(workInProgressRootInterleavedUpdatedLanes, lane);
        }

        if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
            markRootSuspended$1(root, workInProgressRootRenderLanes);
        }
    }

    ensureRootIsScheduled(root, eventTime);
    // 检测是否是NoMode，执行同步逻辑
    if (lane === SyncLane && executionContext === NoContext && (fiber.mode & ConcurrentMode) === NoMode) {
        resetRenderTimer();
        flushSyncCallbacksOnlyInLegacyMode();
    }
}
```
## 2.6 performConcurrentWorkOnRoot
> 在上面`2.5.2.4 wokLoop()`的分析中，我们知道，初次渲染的`taskQueue`会携带一个`task.callback`=`performConcurrentWorkOnRoot`

```javascript
function performConcurrentWorkOnRoot(root, didTimeout) {
    resetNestedUpdateFlag();
    currentEventTime = NoTimestamp;
    currentEventTransitionLane = NoLanes;
    var originalCallbackNode = root.callbackNode;
    var didFlushPassiveEffects = flushPassiveEffects();

    var lanes = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes);

    var shouldTimeSlice = !includesBlockingLane(root, lanes) && !includesExpiredLane(root, lanes) && (!didTimeout);
    var exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes);

    if (exitStatus !== RootInProgress) {

        if (exitStatus === RootDidNotComplete) {
            markRootSuspended$1(root, lanes);
        } else {
            var renderWasConcurrent = !includesBlockingLane(root, lanes);
            var finishedWork = root.current.alternate;
            if (renderWasConcurrent && !isRenderConsistentWithExternalStores(finishedWork)) {
                exitStatus = renderRootSync(root, lanes);
                // ...检测exitStatus是否有抛出错误
            }
            root.finishedWork = finishedWork;
            root.finishedLanes = lanes;
            finishConcurrentRender(root, exitStatus, lanes);
        }
    }

    ensureRootIsScheduled(root, now());

    if (root.callbackNode === originalCallbackNode) {
        return performConcurrentWorkOnRoot.bind(null, root);
    }

    return null;
}
```
### 2.6.1 renderRootConcurrent
```javascript
function renderRootConcurrent(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= RenderContext;
    var prevDispatcher = pushDispatcher(); // If the root or lanes have changed, throw out the existing stack

    if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        if (isDevToolsPresent) {
            var memoizedUpdaters = root.memoizedUpdaters;
            if (memoizedUpdaters.size > 0) {
                restorePendingUpdaters(root, workInProgressRootRenderLanes);
                memoizedUpdaters.clear();
            }
            movePendingFibersToMemoized(root, lanes);
        }
        workInProgressTransitions = getTransitionsForLanes();
        resetRenderTimer();
        prepareFreshStack(root, lanes);
    }


    markRenderStarted(lanes);

    workLoopConcurrent();

    resetContextDependencies();
    popDispatcher(prevDispatcher);
    executionContext = prevExecutionContext;

    if (workInProgress !== null) {
        markRenderYielded();
        return RootInProgress;
    } else {
        markRenderStopped();
        workInProgressRoot = null;
        workInProgressRootRenderLanes = NoLanes; // Return the final exit status.
        return workInProgressRootExitStatus;
    }
}
```
### 2.6.2 workLoopConcurrent
```javascript
function workLoopConcurrent() {
    // Perform work until Scheduler asks us to yield
    while (workInProgress !== null && !shouldYield()) {
        performUnitOfWork(workInProgress);
    }
}
```
### 2.6.3 performUnitOfWork
主要有三个部分：

- 获取`current`：unitOfWork.alternate
- 执行`beginWork()`，返回一个新的执行任务，赋值给`next`
- 如果`next`为空，则说明已经执行结束，触发`completeUnitOfWork()`，如果不为空，则继续执行，将下一个任务赋值给`workInProgress`
```javascript
function performUnitOfWork(unitOfWork) {
    var current = unitOfWork.alternate;
    var next;

    if ((unitOfWork.mode & ProfileMode) !== NoMode) {
        startProfilerTimer(unitOfWork);
        next = beginWork(current, unitOfWork, subtreeRenderLanes);
        stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
    } else {
        next = beginWork(current, unitOfWork, subtreeRenderLanes);
    }
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
        // If this doesn't spawn new work, complete the current work.
        completeUnitOfWork(unitOfWork);
    } else {
        workInProgress = next;
    }

    ReactCurrentOwner$2.current = null;
}
```

---

上面分析的`workLoop()`和`performUnitOfWork()`的本质思想跟之前[(WIP)React初探-构建最小化的React](https://github.com/wbccb/mini-react/blob/main/docs/1-%E5%89%8D%E7%BD%AE%E7%9F%A5%E8%AF%86%26%E5%8E%9F%E7%90%86%E5%88%9D%E6%8E%A2/0-(WIP)React%E5%88%9D%E6%8E%A2-%E6%9E%84%E5%BB%BA%E6%9C%80%E5%B0%8F%E5%8C%96%E7%9A%84React.md)中`workLoop()`的简单实现是一样的，如下面代码所示，`next`就是下面代码中的`nextUnitOfWork`变量
```javascript
let nextUnitOfWork = null;

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }
    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop);

function performUnitOfWork(nextUnitOfWork) {
    // TODO
}
```

---

### 2.6.3 beginWork

- 能否复用？？
- 根据不同类型，触发不同的处理方法，比如`FunctionComponent`类型，会触发`updateFunctionComponent()`
```javascript
function beginWork(current, workInProgress, renderLanes) {
    if (current !== null) {
        // ...检测props，进行didReceiveUpdate的赋值，下面diff有用
    } else {
        //...
    }

    workInProgress.lanes = NoLanes;

    switch (workInProgress.tag) {
        case IndeterminateComponent:
        //...
        case LazyComponent:
        //...
        case FunctionComponent:
            var Component = workInProgress.type;
            var unresolvedProps = workInProgress.pendingProps;
            var resolvedProps = workInProgress.elementType === Component ? unresolvedProps : resolveDefaultProps(Component, unresolvedProps);
            return updateFunctionComponent(current, workInProgress, Component, resolvedProps, renderLanes);
        case ClassComponent:
        //...
    }
}
```
#### 2.6.3.1 updateFunctionComponent()
```javascript
function updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
    var context;
    var unmaskedContext = getUnmaskedContext(workInProgress, Component, true);
    context = getMaskedContext(workInProgress, unmaskedContext);

    var nextChildren;
    var hasId;
    prepareToReadContext(workInProgress, renderLanes);

    markComponentRenderStarted(workInProgress);

    nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, context, renderLanes);
    hasId = checkDidRenderIdHook();

    markComponentRenderStopped();


    if (current !== null && !didReceiveUpdate) {
        bailoutHooks(current, workInProgress, renderLanes);
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }

    workInProgress.flags |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
}
```
#### 2.6.3.2 reconcileChildren()
进行diff算法的比较，如果能够复用，则进行
```javascript
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
    if (current === null) {
        workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
    } else {
        workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
    }
}
```
### 2.6.4 completeUnitOfWork
```javascript
function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;

    do {
        // The current, flushed, state of this fiber is the alternate. Ideally
        // nothing should rely on this, but relying on it here means that we don't
        // need an additional field on the work in progress.
        var current = completedWork.alternate;
        var returnFiber = completedWork.return; // Check if the work completed or if something threw.

        if ((completedWork.flags & Incomplete) === NoFlags) {
            var next = void 0;

            if ((completedWork.mode & ProfileMode) === NoMode) {
                next = completeWork(current, completedWork, subtreeRenderLanes);
            } else {
                startProfilerTimer(completedWork);
                next = completeWork(current, completedWork, subtreeRenderLanes); // Update render duration assuming we didn't error.

                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
            }

            if (next !== null) {
                // Completing this fiber spawned new work. Work on that next.
                workInProgress = next;
                return;
            }
        } else {
            // This fiber did not complete because something threw. Pop values off
            // the stack without entering the complete phase. If this is a boundary,
            // capture values if possible.
            var _next = unwindWork(current, completedWork); // Because this fiber did not complete, don't reset its lanes.


            if (_next !== null) {
                // If completing this work spawned new work, do that next. We'll come
                // back here again.
                // Since we're restarting, remove anything that is not a host effect
                // from the effect tag.
                _next.flags &= HostEffectMask;
                workInProgress = _next;
                return;
            }

            if ((completedWork.mode & ProfileMode) !== NoMode) {
                // Record the render duration for the fiber that errored.
                stopProfilerTimerIfRunningAndRecordDelta(completedWork, false); // Include the time spent working on failed children before continuing.

                var actualDuration = completedWork.actualDuration;
                var child = completedWork.child;

                while (child !== null) {
                    actualDuration += child.actualDuration;
                    child = child.sibling;
                }

                completedWork.actualDuration = actualDuration;
            }

            if (returnFiber !== null) {
                // Mark the parent fiber as incomplete and clear its subtree flags.
                returnFiber.flags |= Incomplete;
                returnFiber.subtreeFlags = NoFlags;
                returnFiber.deletions = null;
            } else {
                // We've unwound all the way to the root.
                workInProgressRootExitStatus = RootDidNotComplete;
                workInProgress = null;
                return;
            }
        }

        var siblingFiber = completedWork.sibling;

        if (siblingFiber !== null) {
            // If there is more work to do in this returnFiber, do that next.
            workInProgress = siblingFiber;
            return;
        } 

        completedWork = returnFiber; // Update the next thing we're working on in case something throws.

        workInProgress = completedWork;
    } while (completedWork !== null); // We've reached the root.


    if (workInProgressRootExitStatus === RootInProgress) {
        workInProgressRootExitStatus = RootCompleted;
    }
}
```
# 3.渲染更新（Concurrent模式）

# 4.首次渲染（Legacy模式）
# 3.渲染更新（Legacy模式）


# 参考

1. [图解React](https://7km.top/)
2. [React 技术揭秘](https://just-react.osrc.com/just-react/)
3. [React的秘密](https://github.com/neroneroffy/react-source-code-debug)

