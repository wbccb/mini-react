# React源码结构

- `react`: 包含React的核心模块代码，比如`React.createElement`、`React.Component`、`React.Children`
- `react-reconciler`: diff算法，协调器的实现
- `scheduler`: 调度器
- `react-dom`: 宿主环境相关的包
- `shared`: 公共辅助方法，与宿主环境无关


## 流程概述

1. 发生内容更新
2. `Scheduler`: 进行调度，执行`Reconciler`任务
3. `Reconciler`: 进行diff比较，计算出更新的内容，然后交给`Scheduler`->找时机进行`Render`的调度
4. `Render`: 进行DOM的更新渲染


## react

1. `jsx格式`转换为`React.createElment()/jsx方法/jsxDev方法`