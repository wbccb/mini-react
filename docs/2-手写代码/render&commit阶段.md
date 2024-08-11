# render&commit阶段

> 本篇文章是在文章+手写期间的思路总结，是为了辅助文章和手写的产物，可能与最终的实现有所差异，也有可能有部分误差，请结合文章和手写代码仔细甄别（因为我懒得改了=_=）

- `render`阶段`beginWork`：
  - 构建fiber 
  - fiber父子关系的绑定
  - `reconcileChildFibers()`进行子节点的diff，因此需要`FunctionComponent`/`ClassComponent`进行渲染，才能拿到对应的children元素
- `render`阶段`completeWork`: 
  - 对于`HostComponent`进行处理：初始化instance + appendAllChildren()将所有子dom挂载在父dom上
  - 对于`HostText`进行处理：初始化文本DOM，然后进行更新
- `commit`阶段：
  - 直接使用原生的方法，比如appendChild、deleteChild等操作DOM，由于组件已经在render阶段构建完成，因此这里直接appendChild(dom)即可
  - 调用对应的effect函数的里面的内容！也就是处理fiber.updateQueue的lastEffect等链表数据


初始化时，`beginWork`会阻止设置`Placement`的`flag`，然后在`completeWork`会进行`HostComponent`的处理：初始化instance + appendAllChildren()将所有子dom挂载在父dom上

但是更新时，`beginWork`不会阻止`Placement`的`flag`，然后在`completeWork`会进行`HostComponent`的处理：更新属性

而`beginWork`的`FunctionComponent`/`ClassComponent`无论是首次渲染/渲染更新，都会触发！

## render阶段

当前fiber与fiber.children之间的切换依赖`completeUnitOfWork`

- beginWork
- completeWork



### beginWork

主要根据`fiber.tag`调用不同的方法进行处理，核心方法最终都会调用`mountChildFibers`进行children元素的对比
- 能够复用的数据，打上可以复用的flag
- 不能复用的数据，打上删除的flag
- 新增的数据，打上新增或者移动的flag

最终构建出fiber树！并且fiber都打上了flags!

### completeWork

主要根据`fiber.tag`调用不同的方法进行处理，大部分直接返回null + 没做什么处理

但是对于`HostComponent`来说，会初始化dom + appendAllChildren()将所有子dom挂载在父dom上

这个阶段会初始化所有fiber的stateNode，并且绑定它们之间的关系，但是root不会跟它们绑定！因为要等到commit阶段root才会跟它们绑定！

## commit阶段

根据标签调整DOM之间的关系，该复用就复用、该插入就插入、该删除就删除、该新增就新增

最终将rootDom与这些dom关联起来，形成DOM树！
