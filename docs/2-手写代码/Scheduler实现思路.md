# Scheduler手写思路

## 基本流程
1. 新建一个task，处理startTime（根据options.delay判断是taskQueue内容还是timeQueue内容），处理expirationTime（根据优先级设置不同的过期时间），加入到对应的queue中
2. 然后触发`requestHostCallback(flushWork)`: 进行boolean值锁的设置，`scheduledHostCallback=flushWork`，然后触发schedulePerformWorkUtilDeadLine()
3. `schedulePerformWorkUtilDeadLine`: MessageChannel触发post.postMessage(null)
4. 宏任务触发performWorkUntilDeadline: 执行之前`requestHostCallback`设置的callback(`scheduledHostCallback=flushWork`)进行执行，判断返回结果，如果返回结果显示hasWork(一般是任务执行过长导致的work包含的多个task没有执行完毕)，再次MessageChannel触发post.postMessage(null)


## 宏任务具体内容
`flushWork`本质就是执行`workLoop` + 一些全局变量的重置 + 错误的处理

`workLoop`:
- 从`taskQueue`中不断取出`task`进行执行，首先设置task.callback=null
- 如果`task.callback`返回function，说明还没执行完毕，那么task.callback=continueCallback
- 如果`task.callback`没有返回function，执行完毕，则继续从`taskQueue`的栈顶取出`task`进行执行
- 在每一次可能的场景中，判断是否需要将`timeQueue`取出`task`放入到`taskQueue`进行执行（startTime是否已经到达）

### `workLoop`中断

当【`taskQueue`的栈顶元素`task.expirationTime`大于当前时间】 && 【`!hasTimeRemaining || shouldYieldToHost()`没有时间可以继续执行任务】
> 系统没有时间给你执行，而且当前任务还可以拖一拖的情况下，`hasWork=true`触发新一轮宏任务

中断while循环，currentTask不为空，直接返回true，`hasWork=true`=>再次`MessageChannel触发post.postMessage(null)`

### `workLoop`的`taskQueue`执行完毕后的处理

- 新增task时：当`taskQueue`为空时，我们增加一个新的`task`，但是`task.startTime`大于当前时间，因此`taskQueue`不需要执行，这个时候进行倒计时，`timeQueue`的栈顶进行startTime-当前时间的setTimeout倒计时
- workLoop执行时：当`taskQueue`为空时，`taskQueue`不需要执行，这个时候进行倒计时，`timeQueue`的栈顶进行startTime-当前时间的setTimeout倒计时




## taskQueue二叉堆实现思路

