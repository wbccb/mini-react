---
outline: [1, 6]
---


# HostRoot & HostComponent举例分析
当我们使用下面的测试代码时，涉及到有

+ `HostRoot`：根类型，代表的是`#root`
+ `HostComponent`：原生标签类型，代表的是`<div>`、`<span>`、`<p>`

```javascript
const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
root.render(
        <div>
          <span>
            <p></p>
          </span>
        </div>
);
```

## HostRoot-beginWork
触发的是`updateHostRoot()`方法，直接触发的就是`reconcileChildren()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
  }
}

function updateHostRoot(current, workInProgress, renderLanes) {
  if (nextChildren === prevChildren) {
    // 新旧children相同，阻止渲染
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

而我们知道，`reconcileChildren()`实际调用的就是`ChildReconciler(true)`或者是`ChildReconciler(false)`，而这里由于`current`不为空，因此用的是`ChildReconciler(true)`

```javascript
var reconcileChildFibers = ChildReconciler(true);
var mountChildFibers = ChildReconciler(false);
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  if (current === null) {
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes
    );
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}
```

> 那为什么`current`不为空呢？
>

从下面`performUnitOfWork()`可以知道，`current`就是`fiber.alternate`，而根`fiber`的早期的准备中，就已经触发`createWorkInProgress()`进行`fiber.alternate`的构建（只有根`fiber`才有如此待遇！）

```javascript
function performUnitOfWork(unitOfWork) {
  var current = unitOfWork.alternate;
  var next = beginWork(current, unitOfWork, subtreeRenderLanes);
  //...
}
function createWorkInProgress(current, pendingProps) {
  var workInProgress = current.alternate;

  if (workInProgress === null) {
    workInProgress = createFiber(...);

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  }
}
```

回到`ChildReconciler(true)`，此时

+ `returnFiber`: `current.alternate`双缓冲树的根`fiber`
+ `currentFirstChild`：旧的`children`第一个元素，此时由于是首次渲染，因此为`null`
+ `newChild`：新的`children`，如下面所示，触发的是`placeSingleChild(reconcileSingleElement())`方法

```javascript
child = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { children: {...} },
  ref: null,
  type: "div",
  _owner: null,
};
```

```javascript
function ChildReconciler(shouldTrackSideEffects) {
  function reconcileChildFibers(returnFiber,currentFirstChild,newChild...) {
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            )
          );
      }
    }
  }
  return reconcileChildFibers;
}
```

### reconcileSingleElement
直接根据上面`child`代码所展示的数据触发`createFiberFromElement()`进行`fiber`的构建，然后直接返回构建的`fiber`

```javascript
function reconcileSingleElement(
  returnFiber,
  currentFirstChild,
  element,
  lanes
) {
  if (element.type === REACT_FRAGMENT_TYPE) {
    //...
  } else {
    var _created4 = createFiberFromElement(element, returnFiber.mode, lanes);

    _created4.ref = coerceRef(returnFiber, currentFirstChild, element);
    _created4.return = returnFiber;
    return _created4;
  }
}
```

注意：此时`element`，也就是上面的`child`的`props`就是它的`children`数据，比如`<span>`、比如`<p>`，会直接放在`fiber.pendingProps`（如下面代码所示），这个`fiber.pendingProps`后续流程中会用到

```javascript
function createFiberFromElement(element, mode, lanes) {
  var owner = null;

  var type = element.type;
  var key = element.key;
  var pendingProps = element.props;
  var fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes,
  );

  return fiber;
}
```

### placeSingleChild
此时的`newFiber`是根`fiber`的`childFiber`，也就是`<div>`所代表的`fiber`，此时由于

+ `shouldTrackSideEffects`=`true`
+ `newFiber.alternate`=`null`

因此`newFiber`打上了`Placement`的`flags`标签

```javascript
function placeSingleChild(newFiber) {
  if (shouldTrackSideEffects && newFiber.alternate === null) {
    newFiber.flags |= Placement;
  }

  return newFiber;
}
```

### 总结
回到`performUnitOfWork()`，此时`beginWork()`返回的就是`<div>`所对应的`fiber`，然后触发`workInProgress`=`next`，然后继续执行`beginWork()`，此时`fiber.tag`为`HostComponent`

```javascript
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

## HostComponent-beginWork
触发的是`updateHostComponent()`方法

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
  }
}
```

从`fiber.pendingProps`中获取对应的`children`数据

> `7.1.1 placeSingChild`中可以查看`fiber.pendingProps`具体的分析
>

然后触发

+ `markRef()`：如果存在`fiber.ref`，则标记`Ref`的`flags`标签
+ `reconcileChildren()`：在首次渲染中，不协调子节点，这里直接构建`fiber.childFiber`
+ 直接返回构建的`fiber.childFiber`

```javascript
function updateHostComponent(current, workInProgress, renderLanes) {
  var type = workInProgress.type;
  var nextProps = workInProgress.pendingProps;
  var prevProps = current !== null ? current.memoizedProps : null;
  var nextChildren = nextProps.children;

  markRef(current, workInProgress);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
function markRef(current, workInProgress) {
  var ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    workInProgress.flags |= Ref;
    workInProgress.flags |= RefStatic;
  }
}
```

由于`HostComponent`不会跟`HostRoot`类型一样先创建`fiber.alternate`，因此这里`current`=`null`，触发的是`ChildReconciler(false)`

```javascript
var reconcileChildFibers = ChildReconciler(true);
var mountChildFibers = ChildReconciler(false);
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  if (current === null) {
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes
    );
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}
```

此时`nextChildren`变为`type: span`，但是其它属性跟`<div>`一样

```javascript
nextChildren = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { children: {...} },
  ref: null,
  type: "span",
  _owner: null,
};
```

因此触发的也是同样的`placeSingleChild(reconcileSingleElement())`方法

```javascript
function ChildReconciler(shouldTrackSideEffects) {
  function reconcileChildFibers(returnFiber,currentFirstChild,newChild...) {
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            )
          );
      }
    }
  }
  return reconcileChildFibers;
}
```

只不过相比较`HostRoot`触发`reconcileChildren()`，这里的`shouldTrackSideEffects`=`false`，因此不会打上`Placement`的`flags`标签，直接返回`fiber`，什么都不操作



`reconcileChildren()`返回的是`<span>`新构建的`fiber`，此时`workInProgress`=`<span>`，然后又经历一遍`HostComponent-beginWork`的流程，最终`<p>`的`reconcileChildren()`由于传入的`child`为`null`，因此直接返回`null`

```javascript
const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
root.render(
    <div>
        <span>
            <p></p>
        </span>
    </div>
);
```

如下面代码所示，此时`next`=`null`，触发`completeUnitOfWork()`，此时`unitOfWork`=`<span>`对应的`fiber`

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

## HostComponent-completeWork
对于`HostComponent`，由于在`beginWork()`只是创建了`fiber`，并没有创建对应的`DOM`元素，因此`workInProgress.stateNode`=`null`



从下面代码，可以知道，整体核心流程可以总结为：

+ `createInstance()`：使用原生`createElement()`方法创建`原生DOM`
+ `appendAllChildren()`：原生`DOM`之间的关联`parentInstance.appendChild(child)`
+ `workInProgress.stateNode = instance`：将原生`DOM`赋值给`fiber.stateNode`
+ `finalizeInitialChildren()`：初始化原生元素的一些事件处理和初始化属性，比如`input`输入框的`input.value`等等
+ `bubbleProperties()`进行`flags`和`lanes`的冒泡：处理`fiber.subtreeFlags`和`fiber.childLanes`进行`flags`和`lanes`的冒泡合并

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case HostComponent: {
      var type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        //...更新逻辑
      } else {
        if (!newProps) {
          bubbleProperties(workInProgress);
          return null;
        }
        var instance = createInstance(type, ...);
        appendAllChildren(instance, workInProgress, false, false);
        workInProgress.stateNode = instance;
        
        if (finalizeInitialChildren(...)) {
          //... workInProgress.flags |= Update;
        }
        if (workInProgress.ref !== null) {
          //...workInProgress.flags |= Ref;
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
  }
}
```

### appendAllChildren()
从下面代码可以看出，有非常多层逻辑，涉及到多种`fiber.tag`，以及各种`child`和`sibling`的寻找，这其实涉及到`fiber.tag`=`Fragment`等多层级嵌套`DOM`

的寻找，比如`<><><p></p></></>`，`p标签`需要不断向上寻找多层触发`dom.appendChild()`，这种情况将在后续进行分析



在我们这个示例中，我们只命中了`node.tag === HostComponent`，因此触发了

+ `<span></span>`触发`appendChild(<p></p>)`，变为`<span><p></p></span>`
+ `<div></div>`触发`appendChild()`，变为`<div><span><p></p></span></div>`

```javascript
appendAllChildren = function (parent, workInProgress) {
  var node = workInProgress.child;

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.tag === HostPortal) {
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === workInProgress) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
};
function appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
}
```

打印出来的数据结构如下图所示

![](https://cdn.nlark.com/yuque/0/2024/png/35006532/1723284470536-e9c6da06-0376-4e00-8b2f-f656f2ac09cc.png)

### bubbleProperties()
将`childrenFiber`相关的`lanes`和`flags`向上冒泡

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

## HostRoot-completeWork
由于我们初始化时`hydrated`=`false`，因此这里进行`Snapshot`标记

然后触发`bubbleProperties()`，将`childrenFiber`相关的`lanes`和`flags`向上冒泡

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case HostRoot: {
      if (current !== null) {
        var prevState = current.memoizedState;
        if (
                !prevState.isDehydrated ||
                (workInProgress.flags & ForceClientRender) !== NoFlags
        ) {
          workInProgress.flags |= Snapshot;
        }
      }
      //...
      bubbleProperties(workInProgress);
      return null;
    }
  }
}
```

## commit阶段
> 在上面对于`commit`阶段的分析中，我们知道会先处理`children`->`children.sibling`->`parent`->`finishedWork`
>
> 这里不再重复这个流程的代码逻辑，直接展示对应的执行方法
>

### HostComponent-commitBeforeMutationEffects()
无`Snapshot`标记，不处理

### HostRoot-commitBeforeMutationEffects()
主要处理`Snapshot`标记，我们知道在`completeWork()`进行`Snapshot`标记，因此这里会触发`clearContainer()`进行`dom.textContent`的重置，会清空`#root`的所有`children`数据

> 比如`<div id="divA">This is <span>some</span> text!</div>`，你可以用`textContent` 去获取该元素的文本内容：`This is some text!`
>
> 在节点上设置 `textContent` 属性的话，会删除它的所有子节点，并替换为一个具有给定值的文本节点（可以线上运行试试效果）
>

```javascript
function commitBeforeMutationEffectsOnFiber(finishedWork) {
  var current = finishedWork.alternate;
  var flags = finishedWork.flags;

  if ((flags & Snapshot) !== NoFlags) {
    switch (finishedWork.tag) {
      case HostRoot: {
        var root = finishedWork.stateNode;
        clearContainer(root.containerInfo);
        break;
      }
    }
  }
}
function clearContainer(container) {
  if (container.nodeType === ELEMENT_NODE) {
    container.textContent = "";
  } else if (container.nodeType === DOCUMENT_NODE) {
    //...
  }
}
```

### HostRoot-commitMutationEffects()
> 没有`Update`相关标记需要处理
>

从下面代码，我们知道，总体逻辑为：

+ 先触发`recursivelyTraverseMutationEffects()`处理`children`，由于`HostRoot-beginWork`中触发`reconcileChildren()`时`shouldTrackSideEffects`=`true`，因此对于`HostRoot`的第一层`children`会进行`Placement`的标记 => 在下面小节将展开分析
+ `commitReconciliationEffects()`：`HostRoot`没有`Placement`的标记，不做任何处理

```javascript
function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
  var current = finishedWork.alternate;
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      if (flags & Update) {
        //...
      }
      return;
    }
  }
}
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

### HostComponent-commitMutationEffects()
除了由于`HostRoot`的第一层`children`触发`reconcileChildren()`时`shouldTrackSideEffects`=`true`，其他的时候触发`reconcileChildren()`时`shouldTrackSideEffects`=`false`，因此其它层级触发`commitMutationEffectsOnFiber()`时：

+ `recursivelyTraverseMutationEffects()`：`parentFiber.subtreeFlags & MutationMask`不符合，不触发深度继续遍历
+ `commitReconciliationEffects()`：没有`Placement`的标记，不做任何处理

```javascript
function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
  var current = finishedWork.alternate;
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case HostComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      if (flags & Ref) {
        //...
      }
      if (flags & Update) {
        //...
      }
      return;
    }
  }
}
```

> 接下来我们着重分析能够触发`commitReconciliationEffects()`的第一层级
>

由于`HostRoot`的第一层`children`触发`reconcileChildren()`时`shouldTrackSideEffects`=`true`，因此会标记`Placement`，从而触发`commitPlacement()`：

> 注意`commitPlacement()`判断是`parentFiber.tag`！！！不是`fiber.tag`
>

+ `getHostParentFiber()`：获取当前`fiber`的父级`fiber`（`fiber.tag`=`HostComponent`/`HostRoot`/`HostPortal`)
+ `getHostSibling()`：获取当前`fiber`的`DOM`兄弟节点
+ `insertOrAppendPlacementNodeIntoContainer()`：根据实际位置情况（可能有多层级嵌套）进行
  - `parentDom.appendChild(currentFiber.stateNode)`添加到末尾
  - 或者
  - `parentDom.insertBefore(currentFiber.stateNode，当前fiber的DOM兄弟节点)`在某个位置前插入DOM

> `getHostSibling()`和`insertOrAppendPlacementNodeIntoContainer()`的逻辑较为复杂，后续再做分析
>

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
function commitPlacement(finishedWork) {
  var parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot:
    case HostPortal: {
      var _parent = parentFiber.stateNode.containerInfo;
      var _before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              _before,
              _parent,
      );
      break;
    }
  }
}
```

在我们这个示例中，就是触发`#root.appendChild(<div></div>)`，而我们在`HostComponent-completeWork()`中已经形成了`<div><span><p></p></span></div>`，因此整个DOM树就此构建完成！

### commitLayoutEffects()
处理`LayoutMask`，也就是`Update | Callback | Ref | Visibility`相关`flags`标记，本次示例中，没有相关相关`flags`标记，因此不做任何处理

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

# HostText举例分析
当我们使用下面的测试代码时，涉及到有

+ `HostRoot`：根类型，代表的是`#root`
+ `HostComponent`：原生标签类型，代表的是`<div>`、`<span>`
+ `HostText`：文本类型，代表的是`Child2`

```javascript
const domNode = document.getElementById("root");
const root = ReactDOM.createRoot(domNode);
root.render(
        <div id="parent">
          <span>我是Child1</span>
          Child2
        </div>
);
```

## HostRoot-beginWork
触发的是`updateHostRoot()`方法，直接触发的就是`reconcileChildren()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

与上面`7.1 HostRoot-beginWork`的流程一致，都只有一个`HostComponent: <div>`，因此触发

+ `reconcileSingleElement()`：创建`fiber`数据
+ `placeSingleChild()`：打上`Placement`标记

> 然后`beginWork`深度遍历，继续往下执行，目前`fiber`切换为`<div></div>`
>

## (div)HostComponent-beginWork
与`7.HostRoot&HostComponent举例分析`不同的是，此时的`fiber`是`<div>`对应的`fiber`，但是它的`newChild`是一个数组，也就是

+ `<span>我是Child1</span>`
+ `Child2`

因此触发的是`reconcileChildrenArray()`！而不是`reconcileSingleElement()`

```javascript
function ChildReconciler(shouldTrackSideEffects) {
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild) {
    if (typeof newChild === "object" && newChild !== null) {
      if (isArray(newChild)) {
        return reconcileChildrenArray(
                returnFiber,
                currentFirstChild,
                newChild,
                lanes
        );
      }
    }
  }
  return reconcileChildFibers;
}
```

> 这里`reconcileChildrenArray()`涉及到比较复杂的`diff`逻辑，将在后续文章中详细展开，这里只展示我们示例所触发的代码逻辑
>

直接遍历`newChild`，调用`createChild()`创建`Fiber`，然后触发`placeChild()`打上`Forked`标记

> `HostRoot`的第一层child所执行的`shouldTrackSideEffects`=`true`，其他层都是`false`，因此下面代码触发`newFiber.flags |= Forked`
>

```javascript
function reconcileChildrenArray() {
  var oldFiber = currentFirstChild;
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      var _newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
      lastPlacedIndex = placeChild(_newFiber, lastPlacedIndex, newIdx);
      if(_newFiber === null) {
        continue;
      }
      if (previousNewFiber === null) {
        resultingFirstChild = _newFiber;
      } else {
        previousNewFiber.sibling = _newFiber;
      }
      previousNewFiber = _newFiber;
    }
    return resultingFirstChild;
  }
}
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  if (!shouldTrackSideEffects) {
    newFiber.flags |= Forked;
    return lastPlacedIndex;
  }
  //...
}
```

### createChild-createFiberFromText
> 这里的创建`fiber`涉及到多种类型的创建，代码也非常多，这里只展示示例所触发的代码逻辑
>

我们知道示例的数组是：

+ `<span>我是Child1</span>`
+ `Child2`

当涉及到`<span></span>`对应的`fiber`创建时，如同`7.1.1 reconcileSingleElement()`的逻辑一致，触发的是`createFiberFromElement()`单元素`fiber`创建，这里不再重复分析



而涉及到`Child2`时会触发`createFiberFromText()`创建`fiber`

```javascript
function createChild(returnFiber, newChild, lanes) {
  if (
          (typeof newChild === "string" && newChild !== "") ||
          typeof newChild === "number"
  ) {
    var created = createFiberFromText("" + newChild, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  if (typeof newChild === "object" && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE: {
        var _created = createFiberFromElement(
                newChild,
                returnFiber.mode,
                lanes
        );

        _created.ref = coerceRef(returnFiber, null, newChild);
        _created.return = returnFiber;
        return _created;
      }
    }
  }
  return null;
}
```

而从下面代码我们可以知道，此时的`pendingProps`=`content`=`"Child2"`，也就是说`pendingProps`不一定就是`object`，也有可能是字符串！

```javascript
function createFiberFromText(content, mode, lanes) {
  var fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}
var createFiber = function (tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}
```

## (span)HostComponent-beginWork
跟上面流程相似，触发`updateComponent()`->`reconcileChildren()`->`mountChildFibers()`也就是`ChildReconciler(false)`

 

由于此时的`newChild`=`我是Child1`，是一个纯文本，因此会触发

```javascript
function ChildReconciler(shouldTrackSideEffects) {
  function reconcileChildFibers(returnFiber, currentFirstChild, newChild, ...) {
    //...
    if (
            (typeof newChild === "string" && newChild !== "") ||
            typeof newChild === "number"
    ) {
      return placeSingleChild(
              reconcileSingleTextNode(
                      parentFiber,
                      oldFiberFirstChild,
                      "" + newChild,
                      lanes
              )
      );
    }
    //...
  }
  return reconcileChildFibers;
}
```

`reconcileSingleTextNode()`的逻辑也非常简单，就是创建一个文本元素

```javascript
function reconcileSingleTextNode(
        returnFiber: Fiber,
        currentFirstChild: Fiber | null,
        textContent: string,
        lanes: Lanes
): Fiber {
  //...省略更新相关逻辑
  const created = createFiberFromText(textContent, returnFiber.mode, lanes);
  created.return = returnFiber;
  return created;
}

```

`placeSingleChild(reconcileSingleTextNode())`方法，进行文本元素的创建后，不会打上`Placement`标记（第一层才会打上）

> 由于`<span>`是叶子结点，因此执行完`beginWork()`，就会执行`completeWork()`
>

## (纯文本)HostText-beginWork
无任何处理，直接返回`null`

> 由于`纯文本`是叶子结点，因此执行完`beginWork()`，就会执行`completeWork()`
>

## (纯文本)HostText-completeWork
直接使用当前文本进行`document.createTextNode()`创建对应的文本`DOM`，然后赋值给`workProgress.stateNode`，最后再触发`bubbleProperties()`，将`childrenFiber`相关的`lanes`和`flags`向上冒泡

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case HostText: {
      workInProgress.stateNode = createTextInstance(
              newText,
              _rootContainerInstance,
              _currentHostContext,
              workInProgress
      );
      bubbleProperties(workInProgress);
      return null;
    }
  }
}
function createTextInstance() {
  var textNode = createTextNode(text, rootContainerInstance);
  return textNode;
}
function createTextNode(text, rootContainerElement) {
  return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(
          text
  );
}
```

## (span)HostComponent-completeWork
由于是叶子结点，因此与`7.3 HostComponent-completeWork`相比较，会少掉`appendAllChildren()`的逻辑，也就是：

+ `createInstance()`：使用原生`createElement()`方法创建`原生DOM`
+ `workInProgress.stateNode = instance`：将原生`DOM`赋值给`fiber.stateNode`
+ `finalizeInitialChildren()`：初始化原生元素的一些事件处理和初始化属性，比如`input`输入框的`input.value`等等
+ `bubbleProperties()`进行`flags`和`lanes`的冒泡：处理`fiber.subtreeFlags`和`fiber.childLanes`进行`flags`和`lanes`的冒泡合并

---

> 省略`Child2`纯文本fiber对应的`beginWork()`和`completeWork()`分析，跟上面流程一致，`beginWork()`返回`null`，`completeWork()`创建文本元素
>

---

## (div)HostComponent-completeWork
跟`7.3 HostComponent-completeWork`的流程一致：

+ `createInstance()`：使用原生`createElement()`方法创建`原生DOM`
+ `appendAllChildren()`：原生`DOM`之间的关联`parentInstance.appendChild(child)`，将所有`child`的`dom`都关联起来
+ `workInProgress.stateNode = instance`：将原生`DOM`赋值给`fiber.stateNode`
+ `finalizeInitialChildren()`：初始化原生元素的一些事件处理和初始化属性，比如`input`输入框的`input.value`等等
+ `bubbleProperties()`进行`flags`和`lanes`的冒泡：处理`fiber.subtreeFlags`和`fiber.childLanes`进行`flags`和`lanes`的冒泡合并

## HostRoot-completeWork
> 与`7.4 HostRoot-completeWork`流程一致
>

由于我们初始化时`hydrated`=`false`，因此这里进行`Snapshot`标记

然后触发`bubbleProperties()`，将`childrenFiber`相关的`lanes`和`flags`向上冒泡

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case HostRoot: {
      if (current !== null) {
        var prevState = current.memoizedState;
        if (
                !prevState.isDehydrated ||
                (workInProgress.flags & ForceClientRender) !== NoFlags
        ) {
          workInProgress.flags |= Snapshot;
        }
      }
      //...
      bubbleProperties(workInProgress);
      return null;
    }
  }
}
```

## commit阶段
在`commit阶段`中，主要是根据不同`flags`去触发不同逻辑



由于在`render阶段`，`HostText`类型并没有什么特殊`flags`，因此流程与`7.5 commit阶段`一致：

+ `HostRoot`: 由于`Snapshot`，在`commitBeforeMutationEffects()`触发`container.textContent = ""`
+ `HostComponet(div)`：由于`Placement`，再`commitMutationEffects()`触发了`commitPlacement()`将`#root`和`<div>`两个`dom`进行关联

# Fragment举例分析
> 经过上面`HostRoot`、`HostComponent`、`HostText`的举例分析，我们已经了解到`render阶段`中的`beginWork()`和`completeWork()`以及`commit阶段`中的`commitBeforeMutaion`、`commitMutationEffects`、`commitLayoutEffects`的具体执行逻辑，因此我们在这个`Fragment`中不会再进行具体的例子分析，而是直接根据这几个阶段去分析`Fragment`有何特殊的地方
>

```javascript
const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
const fragment = (
        <React.Fragment>
          <React.Fragment>
            <span>我是Fragment里面的Child1</span>
          </React.Fragment>
          <p>Child2</p>
        </React.Fragment>
)
root.render(fragment);
```

## beginWork()
### HostRoot
一开始触发`HostRoot`的`beginWork()`->`reconcileChildren()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

在`reconcileChildFibers()`中，由于我们的第一层元素是`<React.Fragment>`，因此`newChild.type === REACT_FRAGMENT_TYPE`，因此`isUnkeyedTopLevelFragment`=`true`，因此`newChild`=`newChild.props.children`，从而触发`reconcileChildrenArray()`方法，此时`newChild`:

+ `<React.Fragment></React.Fragment>`
+ `<p></p>`

> 注意：也就是第一层`React.Fragment`直接不渲染
>

```javascript
function reconcileChildFibers(returnFiber, currentFirstChild, newChild, lanes) {
  var isUnkeyedTopLevelFragment =
          typeof newChild === "object" &&
          newChild !== null &&
          newChild.type === REACT_FRAGMENT_TYPE &&
          newChild.key === null;

  if (isUnkeyedTopLevelFragment) {
    newChild = newChild.props.children;
  }
  if (typeof newChild === "object" && newChild !== null) {
    if (isArray(newChild)) {
      return reconcileChildrenArray(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
      );
    }
  }
}
```

而`reconcileChildrenArray()`进行`fiber`创建调用的也是

+ `createChild()`->`createFiberFromElement()`：创建对应的`fiber`数据
+ `placeChild()`：打上`Placement`标记

> 注意：由于第一层是`React.Fragment`，它直接不渲染，直接`newChild`=`newChild.props.children`，因此此时`shouldTrackSideEffects`=`true`，会打上`Placement`标记
>

```javascript
function reconcileChildrenArray() {
  var oldFiber = currentFirstChild;
  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      var _newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
      lastPlacedIndex = placeChild(_newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = _newFiber;
      } else {
        previousNewFiber.sibling = _newFiber;
      }
      previousNewFiber = _newFiber;
    }
    return resultingFirstChild;
  }
}
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  if (!shouldTrackSideEffects) {
    //...
  }
  var current = newFiber.alternate;
  if (current !== null) {
    //...
  } else {
    // This is an insertion.
    newFiber.flags |= Placement;
    return lastPlacedIndex;
  }
}
```

### Fragment
> 此时触发的是第二个`<React.Fragment>`的`beginWork()`!
>

触发`updateFragment()`，然后直接触发`reconcileChildren()`进行`children`的`fiber`构建

> 注：`reconcileChildren()`就是创建第二个`<React.Fragment>`的`children`对应的`fiber`，没什么特别的地方，这里就不展开分析了！
>

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case Fragment:
      return updateFragment(current, workInProgress, renderLanes);
  }
}
function updateFragment(current, workInProgress, renderLanes) {
  var nextChildren = workInProgress.pendingProps;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

## completeWork()
没有进行什么特殊的处理，只是触发`bubbleProperties()`

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
  }
}
```

## commit阶段
由于在`beginWork()`阶段，直接略过了第一层`<React.Fragment>`的`fiber`创建，因此目前`root`的`childrenFiber`如下图所示

+ `<React.Fragment>`
+ `<p>`

![](https://cdn.nlark.com/yuque/0/2024/png/35006532/1723516628820-a5fc08d0-4a58-45cb-97c7-5bf8c96b0874.png)

因此触发`commit阶段`时，我们可以直接忽视第一层`<React.Fragment>`，直接看第二层`<React.Fragment>`



在`commitBeforeMutaion`中，触发了`HostRoot`的`clearContainerContent()`，`Fragment`无任何处理

在`commitMutationEffects`中，触发了`default`分支，也是触发

+ `recursivelyTraverseMutationEffects()`
+ `commitReconciliationEffects()`

```javascript
function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
  var current = finishedWork.alternate;
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    default: {
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      return;
    }
  }
}
```

> `recursivelyTraverseMutationEffects()`就是继续向下遍历`HostComponent`，由于`shouldTrackSideEffects`=`false`，因此不会打上`flags`，因此不会触发`commit阶段`
>

此时`finishedWork`=`<React.Fragment>`，会触发`commitPlacement()`，因此`HostRoot`的第一层children会打上`Placement`标记，然后进行`dom.appendChild()`操作，实现`#root`与`childFiber.stateNode`的关联！！

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
function commitPlacement(finishedWork) {
  var parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot:
    case HostPortal: {
      var _parent = parentFiber.stateNode.containerInfo;
      var _before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              _before,
              _parent,
      );
      break;
    }
  }
}
```

> 上面的`dom.appendChild()`只看表层含义是非常好理解的！但是我们目前分析的`Fragment`类型，`Fragment`是不具备`DOM`的！因此它是怎么进行`DOM`关联的呢？
>

```javascript
function getHostSibling(fiber) {
  var node = fiber;

  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }

      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    while (
            node.tag !== HostComponent &&
            node.tag !== HostText &&
            node.tag !== DehydratedFragment
            ) {
      if (node.flags & Placement) {
        continue siblings;
      }

      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}
```

在`getHostSibling()`中，有几条规则：

+ 我们会试着找当前`fiber`的`sibling`，此时的`<React.Fragment>`的`sibling`=`<p></p>`，当然，如果`node.sibling`不存在，那么我们会试着往上再找一层，然后找它的`sibling`，因为可能存在下面的情况，当我们的`fiber`=`<p>`时，它的`sibling`为空，我们只能找它的`return.sibling`

> 如果当前`fiber`的`sibling`为空，往上一层的`fiber`也为空 => 没必要往上找了，直接返回`null`
>
> 如果当前`fiber`的`sibling`为空，往上一层`fiber`又具备`DOM`，并不是下面这种`<><p></p></>`，那我们也不能拿上一层`fiber`的`sibling`作为参照物去插入`DOM`！=> 没必要往上找了，直接返回`null`
>

```html
<div>
  <React.Fragment>
    <p></p>
  </React.Fragment>
  <span/>
</div>
```

+ 当我们找到了当前`fiber`的`sibling`，我们还要判断它是不是具备`DOM`的`fiber`类型，比如`Fragment`的`fiber`类型是不具备`DOM`的，但是`HostComponent`的`fiber`类型是具备`DOM`的
  - 如果它不具备`DOM`，我们要试一下它的`child`，比如上面示例中，我们的`<React.Fragment>`不具备`DOM`，但是它的`<p>`是有`DOM`的
  - 如果它不具备`DOM`，`child`又为空 => 继续找它的下一个`sibling`
  - 如果它不具备`DOM`，本身又有`Placement`标记（本身就可能是插入或者移动），那我们就不能把它当作参照物，那还是得 => 继续找它的下一个`sibling`
  - 如果它具备`DOM`，那它就很可能是我们需要的参照物，判断下是否有`Placement`标记（本身就可能是插入或者移动），有`Placement`标记，那还是得 => 继续找它的下一个`sibling`
  - 如果它具备`DOM`，没有`Placement`标记，那它就是我们想要的稳定位置的参照物！！！

在我们这个示例中：

+ 找到了当前`fiber`的`sibling`=`<p></p>`
+ 当前`fiber`的`sibling`具备`DOM`，但是它有`Placement`标记（本身就可能是插入或者移动），那我们就不能把它当作参照物 => 继续找它的下一个`sibling`
+ 它的`sibling`为空，往上一层`fiber`又具备`DOM`，我们不能拿上一层`fiber`的`sibling`作为参照物去插入`DOM`！=> 没必要往上找了，直接返回`null`

因此最终返回的`_before`为空，从而触发`dom.appendChild()`方法，而不是`dom.insertBefore()`方法

```javascript
function commitPlacement(finishedWork) {
  var parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot:
    case HostPortal: {
      var _parent = parentFiber.stateNode.containerInfo;
      var _before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              _before,
              _parent,
      );
      break;
    }
  }
}
```

# FunctionComponent举例分析
```javascript
const domNode = document.getElementById('root');
const root = ReactDOM.createRoot(domNode);
const App = ({testProps}) => {
  return (
          <div id={"parent"} class={testProps}>
            <p id={"child"}>我是child1</p>
          </div>
  )
}
root.render(<App testProps={"app-children-wrapper"}/>);
```

## beginWork()
### HostRoot
一开始触发`HostRoot`的`beginWork()`->`reconcileChildren()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

`reconcileChildren()`此时传入的`nextChildren`为：

```javascript
nextChildren = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { testProps: "app-children-wrapper" },
  ref: null,
  type: ƒ App(_ref),
  _owner: null,
};
```

最终触发的`createChild()`的`createFiberFromElement()`创建`fiber`

```javascript
function createChild(returnFiber, newChild, lanes) {
  if (typeof newChild === "object" && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE: {
        var _created = createFiberFromElement(
                newChild,
                returnFiber.mode,
                lanes
        );
        _created.ref = coerceRef(returnFiber, null, newChild);
        _created.return = returnFiber;
        return _created;
      }
    }
  }
  return null;
}
```

由于`FunctionComponent`满足`typeof type === "function"`+ 不满足`shouldConstruct(type)`，因此`fiberTag`=`IndeterminateComponent`

```javascript
function createFiberFromTypeAndProps() {
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  var fiberTag = IndeterminateComponent;
  var resolvedType = type;
  if (typeof type === "function") {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
    }
  }
  var fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;
  return fiber;
}
function shouldConstruct(Component) {
  var prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}
```

### IndeterminateComponent
+ 触发`renderWithHoos()`进行`FunctionComponent`的渲染
+ `workInProgress.flags |= PerformedWork`
+ `workInProgress.tag = FunctionComponent`
+ 然后触发组件函数中子元素的渲染：`reconcileChildren(null, workInProgress, value)`

> 注：传入的`current`=`null`，触发`ChildReconciler(false)`，不进行`flags`的标记！
>

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
  workInProgress.flags |= PerformedWork;
  if (
          // 存在render函数() + value.$$typeof等于undefined就是Class组件
          typeof value === "object" &&
          value !== null &&
          typeof value.render === "function" &&
          value.$$typeof === undefined
  ) {
    workInProgress.tag = ClassComponent;
    //...处理Function中Class组件的逻辑
  } else {
    //...
    workInProgress.tag = FunctionComponent;
    reconcileChildren(null, workInProgress, value, renderLanes);
    return workInProgress.child;
  }
}
```

#### renderWithHooks()
核心方法就是调用`Component()`进行渲染，如下面注释代码所示，我们这个示例的`Component()`方法为自动转化的`React.createElement`

```javascript
function renderWithHooks() {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber$1 = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;
  //   function App(_ref) {
  //     var testProps = _ref.testProps;
  //     return React.createElement(
  //       "div",
  //       { id: "parent", class: testProps },
  //       React.createElement("p", { id: "child" }, "\\u6211\\u662Fchild1")
  //     );
  //   }
  var children = Component(props, secondArg); // workInProgress.type

  renderLanes = NoLanes;
  currentlyRenderingFiber$1 = null;
  return children;
}
```

执行完成`Component()`之后，我们可以从`renderWithHooks()`得到的`value`如下所示：

```javascript
value = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { id: "parent", children: {...} },
  ref: null,
  type: "div",
  _owner: null,
};
```

> 继续触发`beginWork()`跟上面`HostComponent`的`beginWork()`的流程一模一样，这里不再重复分析
>

## completeWork
![](https://cdn.nlark.com/yuque/0/2024/svg/35006532/1720158859314-56aefcb8-01e9-4934-afde-1c5eebf90064.svg)

从上图的执行顺序，我们可以知道，函数组件中的`HostComponent`会先执行，然后逐渐向上执行

每一个`HostComponent-completeWork()`会执行`createInstance()` + `appendAllChildren()`不断创建`DOM`以及关联`parentFiber.stateNode`和`fiber.stateNode`的关系



直到`IndeterminateComponent`的`completeWork()`执行！其实也没执行什么，只是触发`bubbleProperties()`

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
  }
}
```

## commit阶段
在`commit`阶段中，主要处理`flags`相关逻辑，`FunctionComponent`并没有构建什么特殊的`flags`，而`FunctionComponent`又处于`HostRoot`的第一层，因此还是按照上面所分析那样，

当`finishedWork`=`FunctionComponent`时，在`commitReconciliationEffects()`触发`commitPlacement()`处理，也就是根据`parentFiber.tag`触发了：`insertOrAppendPlacementNodeIntoContainer()`

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
function commitPlacement(finishedWork) {
  var parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot:
    case HostPortal: {
      var _parent = parentFiber.stateNode.containerInfo;
      var _before = getHostSibling(finishedWork);
      insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              _before,
              _parent,
      );
      break;
    }
  }
}
```

### insertOrAppendPlacementNodeIntoContainer()
与我们上面分析不同，这里的`node`是`FunctionComponent`，它是不具备`DOM`的！！！因此`isHost`=`false`，触发了第三个条件的代码

+ 我们会直接取`node.child`，也就是`FunctionComponent`中顶层元素`<div>`，然后触发`insertOrAppendPlacementNodeIntoContainer()`，这个时候`node`是`HostComponent`，具备`DOM`，因此可以执行插入操作，也就是`#root.appendChild(<div/>)`
+ 处理完`node.child`还不够，我们还得处理下`node.child.sibling`，因此可能存在着`FunctionComponent`的顶层元素是一个`<React.Fragment>`的情况，它也是一个不具备`DOM`的类型，我们需要`#root.appendChild(Fragment的childDOM)`

```javascript
function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
  var tag = node.tag;
  var isHost = tag === HostComponent || tag === HostText;

  if (isHost) {
    //...
  } else if (tag === HostPortal);
  else {
    var child = node.child;

    if (child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      var sibling = child.sibling;

      while (sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}
```

> 当然，我们的示例是因为刚刚好`FunctionComponent`处于`HostRoot`的第一层，如果不处于第一层，那么就不会打上`Placement`标记，那么它们是如何关联`DOM`的呢？
>

如果`FunctionComponent`不处于`HostRoot`的第一层，假设`FunctionComponent`在某一个`<div>`的下一层级，那么就会在`HostComponent`的`completeWork()`触发`appendAllChildren()`逻辑

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case HostComponent: {
      var type = workInProgress.type;
      if (current !== null && workInProgress.stateNode != null) {
        //...更新逻辑
      } else {
        if (!newProps) {
          bubbleProperties(workInProgress);
          return null;
        }
        var instance = createInstance(type, ...);
        appendAllChildren(instance, workInProgress, false, false);
        workInProgress.stateNode = instance;

        if (finalizeInitialChildren(...)) {
          //... workInProgress.flags |= Update;
        }
        if (workInProgress.ref !== null) {
          //...workInProgress.flags |= Ref;
        }
      }
      bubbleProperties(workInProgress);
      return null;
    }
  }
}
```

在`appendAllChildren()`中，我们也可以看到类似的逻辑

+ 检测当前`node.tag`是否等于`HostComponent`或者`HostText`，如果不是，则向下寻找它对应的`child`=> 也就是`FunctionComponet`的（具备`DOM`的）顶层child元素
+ 处理完成当前`node`，还要执行`parent.appendChild(node.sibling)`操作

上面两个步骤跟`insertOrAppendPlacementNodeIntoContainer()`中关联`DOM`的逻辑是一样的！！

```javascript
appendAllChildren = function (parent, workInProgress) {
  var node = workInProgress.child;

  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.tag === HostPortal) {
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === workInProgress) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
};
```

# ClassComponent举例分析
## beginWork()
### HostRoot
一开始触发`HostRoot`的`beginWork()`->`reconcileChildren()`

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
  }
}
function updateHostRoot(current, workInProgress, renderLanes) {
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

`reconcileChildren()`此时传入的`nextChildren`为：

```javascript
nextChildren = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { },
  ref: null,
  type: ƒ App(_ref),
  _owner: null,
};
```

最终触发的`createChild()`的`createFiberFromElement()`创建`fiber`

```javascript
function createChild(returnFiber, newChild, lanes) {
  if (typeof newChild === "object" && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE: {
        var _created = createFiberFromElement(
                newChild,
                returnFiber.mode,
                lanes
        );
        _created.ref = coerceRef(returnFiber, null, newChild);
        _created.return = returnFiber;
        return _created;
      }
    }
  }
  return null;
}
```

由于`ClassComponent`满足`typeof type === "function"`+ 满足`shouldConstruct(type)`，因此`fiberTag`=`ClassComponent`

```javascript
function createFiberFromTypeAndProps() {
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  var fiberTag = IndeterminateComponent;
  var resolvedType = type;
  if (typeof type === "function") {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
    }
  }
  var fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;
  return fiber;
}
function shouldConstruct(Component) {
  var prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}
```

### ClassComponent
`ClassComponent`类型也是直接触发`updateXXXX()`方法

```javascript
function beginWork(current, workInProgress, renderLanes) {
  didReceiveUpdate = false;
  workInProgress.lanes = NoLanes;
  switch (workInProgress.tag) {
    case ClassComponent: {
      var _Component = workInProgress.type;
      var _unresolvedProps = workInProgress.pendingProps;

      var _resolvedProps =
              workInProgress.elementType === _Component
                      ? _unresolvedProps
                      : resolveDefaultProps(_Component, _unresolvedProps);

      return updateClassComponent(
              current,
              workInProgress,
              _Component,
              _resolvedProps,
              renderLanes
      );
    }
  }
}
```

而`updateClassComponent()`所执行的内容，就比其它类型的逻辑要复杂的多了！主要分为：

+ `constructClassInstance()`：实例化`ClassComponent`，`render()`方法还没触发，只是刚刚初始化`ClassComponent`
+ `mountClassInstance()`：检测生命周期以及初始化一些变量，如果有`componentDidMount`，则打上`Update`和`LayoutStatic`标记（后续渲染更新再分析）
+ `finishClassComponent()`：`ClassComponent.render()`执行 + `reconcileChildren()`渲染子`fiber`

```javascript
function updateClassComponent() {
  var instance = workInProgress.stateNode;
  var shouldUpdate;

  if (instance === null) {
    constructClassInstance(workInProgress, Component, nextProps);
    mountClassInstance(workInProgress, Component, nextProps, renderLanes);
    shouldUpdate = true;
  }

  var nextUnitOfWork = finishClassComponent(
          current,
          workInProgress,
          Component,
          shouldUpdate,
          hasContext,
          renderLanes
  );

  return nextUnitOfWork;
}
```

#### constructClassInstance()
如下面精简代码所示，就是直接`new ctor(props, context)`，这个`ctor`就是`workInProgress.type`！

```javascript
function constructClassInstance(workInProgress, ctor, props) {
  var context = {};
  var instance = new ctor(props, context);
  adoptClassInstance(workInProgress, instance);
  return instance;
}
function adoptClassInstance(workInProgress, instance) {
  instance.updater = classComponentUpdater;
  workInProgress.stateNode = instance;
}
```

此时构建完成的`instance`如下所示

```javascript
instance = {
  context: {},
  props: {},
  refs: {},
}
```

而`classComponentUpdater`是一组工具对象，具备多个工具方法

```javascript
var classComponentUpdater = {
  isMounted: isMounted,
  enqueueSetState: function (inst, payload, callback) {
    //...
  },
  enqueueReplaceState: function (inst, payload, callback) {
    //...
  },
  enqueueForceUpdate: function (inst, callback) {
    //...
  },
};
```

#### mountClassInstance()
如下面精简代码所示，判断`instance.componentDidMount`是否存在，然后打上对应的`flags`

```javascript
function mountClassInstance(workInProgress, ctor, newProps, renderLanes) {
  var instance = workInProgress.stateNode;
  instance.props = newProps;
  instance.state = workInProgress.memoizedState;
  //...
  if (typeof instance.componentDidMount === "function") {
    var fiberFlags = Update;
    fiberFlags |= LayoutStatic;
    workInProgress.flags |= fiberFlags;
  }
}
```

#### finishClassComponent()
最后触发`instance.render()`执行，打上`PerformedWork`标记，触发`reconcileChildren()`进行`children`的渲染

```javascript
function finishClassComponent() {
  var instance = workInProgress.stateNode; // Rerender
  ReactCurrentOwner$1.current = workInProgress;
  var nextChildren = instance.render();
  workInProgress.flags |= PerformedWork;

  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  workInProgress.memoizedState = instance.state; // The context might have changed so we need to recalculate it.

  return workInProgress.child;
}
```

此时的`nextChildren`如下所示，跟上面分析的`jsx`转化后的数据没什么区别，后续就是触发`HostComponent-beginWork()`以及`HostComponent-completeWork()`进行`DOM`的创建和关联！

```javascript
nextChildren = {
  $$typeof: Symbol(react.element),
  key: null,
  props: { id: "我是App顶层元素div", children: {...} },
  ref: null,
  type: "div",
};
```

## completeWork()
没有执行什么方法，只是触发了`bubbleProperties()`

```javascript
function completeWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case ClassComponent: {
      var Component = workInProgress.type;

      if (isContextProvider(Component)) {
        popContext();
      }

      bubbleProperties(workInProgress);
      return null;
    }
  }
}
```

## commit阶段
与`FunctionComponent 10.3 commit阶段`的分析基本一致，触发了`commitPlacement()`->`insertOrAppendPlacementNodeIntoContainer()`，然后由于当前`node`不是`isHost`，从而向下寻找`node.child`进行`DOM`的关联

```javascript
function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
  var tag = node.tag;
  var isHost = tag === HostComponent || tag === HostText;

  if (isHost) {
    //...
  } else if (tag === HostPortal);
  else {
    var child = node.child;

    if (child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      var sibling = child.sibling;

      while (sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}
```

## IndeterminateComponent
在我们上面关于`FunctionComponent`的分析中，我们发现存在一种情况！也可以判断定为`ClassComponent`

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
  workInProgress.flags |= PerformedWork;
  if (
          // 存在render函数() + value.$$typeof等于undefined就是Class组件
          typeof value === "object" &&
          value !== null &&
          typeof value.render === "function" &&
          value.$$typeof === undefined
  ) {
    workInProgress.tag = ClassComponent;
    adoptClassInstance(workInProgress, value);
    mountClassInstance(workInProgress, Component, props, renderLanes);
    return finishClassComponent(null, workInProgress, Component, true, hasContext, renderLanes);
  } else {
    //...
    workInProgress.tag = FunctionComponent;
    reconcileChildren(null, workInProgress, value, renderLanes);
    return workInProgress.child;
  }
}
```

即`FunctionComponent`返回的数据返回了`render()`方法，如下面所示，我们也会作为`ClassComponent`去处理以及渲染！！

```javascript
const AppTest = ()=> {
  return {
    render() {
      <div id={"我是App顶层元素div"}>
        <span>我是内容元素span</span>
      </div>
    }
  }
}
```



# （TOTD）总结
从上面的分析中，我们可以知道，当节点不是root时，我们会直接在render()阶段添加DOM元素形成HTML树，这跟`build own react`的描述是一样的

而节点是root时，会在最后的commit阶段才出发DOM元素的添加，这跟`build own react`最终再添加DOM到root是逻辑是一样的



在当前fiber的逻辑中，先触发reconcileChildren()创建当前fiber的children对应的fiber数据，然后返回第一个children，作为beginWork()的返回值，作为下一个beginWork()处理的fiber，这就是可以从parent->child->叶子child的遍历顺序



创建完成fiber后，从叶子child->child->parent开始触发completeWork()进行DOM元素的创建以及DOM.appendAllChild()的逻辑的触发



最终在commit阶段才触发root对应的dom.appendChild()



> 详细说明？？
>

+ render()阶段：appendAllChildren() - `build own react`的performUnitOfwork()逻辑类似，不处理root元素
+ commit()阶段：处理Placement标记 - `build own react`的performUnitOfwork()逻辑类似，最终处理root元素

# 参考
1. [React中的任务饥饿行为](https://segmentfault.com/a/1190000039149258)


