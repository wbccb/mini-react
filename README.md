# React18
基于`18.3.1`源码进行分析和手写

1. 源码解析文章中的`流程图`：核心代码展示
2. 源码解析`文章`：基于流程图进行核心代码分析
3. 手写`代码`：基于文章分析的核心代码进行最小化工程的实现


## 项目目录

- `debug-demo`是源码文章调试的相关代码
- `docs`是源码文章的目录
- `packages`是手写代码存放的目录
- `examples`是手写代码使用的示例

## docs内容概述

### React基础

- [React18使用详解](https://github.com/wbccb/mini-react/blob/main/docs/0-基础知识/React18使用详解.md)
- [React如何使用css](https://github.com/wbccb/mini-react/blob/main/docs/0-基础知识/React如何使用css.md)
- [React路由](https://github.com/wbccb/mini-react/blob/main/docs/0-基础知识/React路由.md)
- [Redux状态管理多种模式](https://github.com/wbccb/mini-react/blob/main/docs/0-基础知识/Redux状态管理多种模式.md)
- [SSR&CSR](https://github.com/wbccb/mini-react/blob/main/docs/0-基础知识/SSR&CSR.md)

### 前置知识 & 原理初探


## React手写

源码解析中整理的流程图以及根据流程图进行具体的代码分析本质就是`mini-react`的雏形
- 根据博客中的源码解析 => 构建更加完善的`mini-react`代码
- 根据更加完善的`mini-react`代码 => 完善博客中的源码解析的流程图和源码分析流程

### 难点分析

- [Scheduler实现思路.md](https://github.com/wbccb/mini-react/blob/main/docs/2-手写代码/Scheduler实现思路.md)
- [render&commit阶段.md](https://github.com/wbccb/mini-react/blob/main/docs/2-手写代码/render&commit阶段.md)

### 手写代码

- `react`
- `react-dom`
- `react-reconciler`
- `shared`

### 运行调试

```shell
pnpm install 

cd examples

pnpm run dev
```


## 源码解析

### 核心流程

- [(WIP)首次渲染流程分析(一)](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/1.(WIP)%E9%A6%96%E6%AC%A1%E6%B8%B2%E6%9F%93%E6%B5%81%E7%A8%8B%E5%88%86%E6%9E%90(%E4%B8%80).md)
- [(WIP)首次渲染流程分析(二)](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/2.(WIP)%E9%A6%96%E6%AC%A1%E6%B8%B2%E6%9F%93%E6%B5%81%E7%A8%8B%E5%88%86%E6%9E%90(%E4%BA%8C).md)
- [(WIP)非并发更新渲染流程分析(一)](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/3.(WIP)%E9%9D%9E%E5%B9%B6%E5%8F%91%E6%9B%B4%E6%96%B0%E6%B8%B2%E6%9F%93%E6%B5%81%E7%A8%8B%E5%88%86%E6%9E%90(%E4%B8%80).md)
- [(WIP)非并发更新渲染流程分析(二)](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/4.(WIP)%E9%9D%9E%E5%B9%B6%E5%8F%91%E6%9B%B4%E6%96%B0%E6%B8%B2%E6%9F%93%E6%B5%81%E7%A8%8B%E5%88%86%E6%9E%90(%E4%BA%8C).md)
- [(WIP)常见hook源码分析](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/5.(WIP)%E5%B8%B8%E8%A7%81hook%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md)
- [(WIP)合成事件](https://github.com/wbccb/mini-react/blob/main/docs/3-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/6.(WIP)%E5%90%88%E6%88%90%E4%BA%8B%E4%BB%B6.md)
- (TODO)并发模式下的渲染更新流程分析

### 第三方库源码
- (TODO)mobx源码解析
- (TODO)redux源码解析
- (TODO)zustand源码解析
- (TODO)react-router源码解析


# 参考
1. https://dev.to/vinomanick/create-a-monorepo-using-pnpm-workspace-1ebn
2. https://github.com/vinomanick/pnpm-monorepo