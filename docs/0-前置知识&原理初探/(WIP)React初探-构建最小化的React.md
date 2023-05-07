> 本文参考自https://pomb.us/build-your-own-react/ ，基于React 16.8版本

# 构建React框架

> 一步一步从头开始重写React，构建一个简单的React库

1. createElement()
2. render()
3. Concurrent Mode
4. Fibers
5. Render and Commit Phases
6. Reconciliation
7. Function Components
8. Hooks

我们将使用`miniReact`代替`React`，比如`React.createElement()`会替换为`miniReact.createElement()`

# 1.createElement() & render()

下面是`React`最基础的使用

```javascript
const element = <h1 title="foo">Hello</h1>
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

上面的`<h1 title="foo">Hello</h1>`不是原生的JS代码，而是`JSX`，还需要通过`Babel`等构建工具转化为原生的JS
> 转换规则也很简单，就是通过`createElement()`替换标签内的代码，将标签名称、props、children作为参数传入`createElement()`

```javascript
// 最终经过babel等工具，转化jsx为React.createElement的格式
const element = React.createElement(
    "h1",
    {title: "foo"},
    "Hello"
)
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

上面使用`React`等同于下面直接使用原生JS创建元素的形式
> 这代表后面我们的createElement()和render()的内容本质就是下面这些原生代码

```javascript
const element = {
    type: "h1",
    props: {
        title: "foo",
        children: "Hello",
    },
}
const container = document.getElementById("root")

const node = document.createElement(element.type)
node["title"] = element.props.title

const text = document.createTextNode("")
text["nodeValue"] = element.props.children

node.appendChild(text)
container.appendChild(node)
```

## 1.1 createElement()

```javascript
const element = (
    <div id="foo">
        <a>bar</a>
        <b/>
    </div>
)
```

我们使用上面的示例，最终会被转化为`createElement()`

```javascript
const element = miniReact.createElement(
    "div",
    {id: "foo"},
    React.createElement("a", null, "bar"),
    React.createElement("b")
)
```

> `createElement()`要返回什么内容呢？

```javascript
const element = {
    type: "h1",
    props: {
        title: "foo",
        children: "Hello",
    },
}
const container = document.getElementById("root")

const node = document.createElement(element.type)
node["title"] = element.props.title
const text = document.createTextNode("")
text["nodeValue"] = element.props.children

node.appendChild(text)
container.appendChild(node)
```

根据上面代码块，我们知道，`createElement()`要返回一个对象数据`element`，它至少包括`type`和`props`， 然后我们才能根据返回的对象调用对应的`document.createElement()`
创建对应的`DOM`数据

而一些原始值的node，比如`const text = document.createTextNode("")`这种没有具体的类型，我们创建一个`TEXT_ELEMENT`进行赋值

```javascript
const miniReact = {
    createTextElement(text) {
        return {
            type: "TEXT_ELEMENT",
            props: {
                nodeValue: text,
                children: []
            }
        }
    },
    createElement(type, props, ...children) {
        const newChildren = children.map(child =>
            typeof child === "object"
                ? child
                : this.createTextElement(child));
        return {
            type,
            props: {
                ...props,
                children: newChildren
            }
        }
    }
};
```

## 1.2 render()

在上面`1.1 createElement()`的分析中，我们重写了`React.createElement()`，接下来我们进行`ReactDOM.render()`的重写

```javascript
// 最终经过babel等工具，转化jsx为React.createElement的格式
const element = React.createElement(
    "h1",
    {title: "foo"},
    "Hello"
)
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

实现`render`函数，本质就是

- 创建原生DOM元素：使用`document.createElement`
- 将一些属性值赋值到DOM元素上: `dom[name]=element.props[name]`
- 递归创建children的DOM元素: `props.children.forEach(()=>render())`
- 将创建的DOM插入到container中: `container.appendChild(dom)`

```javascript
render(element, container)
{
    const dom = element.type === ELEMENT_TYPE.TEXT_ELEMENT
        ? document.createTextNode("")
        : document.createElement(element.type);

    const isProperty = key => key !== "children";
    Object.keys(element.props)
        .filter(isProperty)
        .forEach(name => {
            dom[name] = element.props[name];
        });

    element.props.children.forEach(child => {
        this.render(child, dom);
    });

    container.appendChild(dom);
}
```

# 2.Concurrent Mode

在上面我们的`render()`函数中，我们递归进行`DOM`的创建，如果`DOM`的数量很多，可能会堵塞主线程的运行

因此我们需要一种机制：
**要把渲染工作分解成小的单元，当我们完成每个渲染单元后，如果还有其他优先级比较高的事情(比如动画和输入响应)，我们会让浏览器中断渲染，等待空闲时，再继续渲染单元工作的执行**

## 2.1 requestIdleCallback

![浏览器一帧](https://wbccb.github.io/Frontend-Articles/image/frameLife.png)

浏览器一帧会经过下面这几个过程：

- 接受输入事件(处理用户的交互，如触碰、滚动、点击等事件)
- 执行JS事件回调
- 开始frame(处理window.resize、scroll、mediaquery、animation events)
- 执行RequestAnimationFrame
- 页面布局，样式计算Layout
- 绘制渲染Pain
- 执行RequestIdelCallback

window.requestIdleCallback() 方法插入一个函数，这个函数将在浏览器空闲时期被调用。

这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。

函数一般会按先进先调用的顺序执行，然而，如果requestIdleCallback指定了执行超时时间timeout，则有可能为了在超时前执行函数而打乱执行顺序。

> requestIdleCallback是有空闲时间才会执行，但是如果制定了timeout，如果到达限定时间还没执行，那么就会超时，强行执行任务，虽然它可能会造成用户操作卡顿以及打乱顺序等情况

但是RequestIdelCallback并不是每一帧都会执行，而是在每一个帧做完上面列举的6个步骤之后如果还有空闲时间才会执行，如果没有剩余时间，则拖入下一帧考虑。

而且RequestIdelCallback如果执行时间过长，长时间不将控制权交还给浏览器，则会影响下一帧的渲染，导致页面出现卡顿和事件响应不及时

> 那我们怎么知道浏览器某一帧还有多少剩余时间呢？

```javascript
requestIdleCallback((deadline) => {
    // deadline 有两个参数 
    // deadline.timeRemaining(): 当前帧还剩下多少时间，最大值50ms 
    // deadline.didTimeout: 是否超时，即整个callback是否超时才触发执行的
    // 另外 requestIdleCallback 后如果跟上第二个参数 {timeout: ...} 表示强制浏览器回调在timeout毫秒过后还没有被调用，那么回调任务将放入事件循环中排队
    if (deadline.timeRemaining() > 0) {
        // TODO 
    } else {
        requestIdleCallback(otherTasks);
    }
}, {timeout: 1000});
```

## 2.2 实现逻辑

虽然`React`已经不使用`requestIdleCallback`进行并发的控制，它自己内部实现了一个scheduler package，但是原理跟`requestIdleCallback`是一样的，在`miniReact`
中我们使用`requestIdleCallback`进行并发渲染的控制

主要流程为：

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

# 3. Fibers

为了实现上面以unit为单位的工作任务，我们需要一种数据结构：一棵fiber树

每一个元素都是一个fiber，而每一个fiber都是一个unit单位的工作量

比如我们渲染

```javascript
miniReact.render(
    <div>
        <h1>
            <p/>
            <a/>
        </h1>
        <h2/>
    </div>,
    container
)
```

上面元素对应的`fiber tree`就是
![fiber tree](https://wbccb.github.io/Frontend-Articles/image/fiber1.png)

然后我们就可以改造`render()`和``

```javascript
function render(element, container) {
    nextUnitOfWork = {
        dom: container,
        props: {
            children: [element],
        },
    }
}

// 上面的render()改造为下面代码
function render(element, container) {
    miniReact.nextUnitOfWork = {
        dom: container,
        props: {
            children: [element]
        }
    }
}
```

然后我们直接调用`requestIdleCallback()`进行`workLoop()`的执行

```javascript
// 调用requestIdleCallback等待浏览器有空闲时间再执行
requestIdleCallback(miniReact.workLoop);
```

融合上面的代码，如下面代码块，就是

- `miniReact.render`赋值nextUnitOfWork
- `requestIdleCallback()`监听浏览器空闲时间开始
- `workLoop()`检测当前浏览器剩余时间是否能够执行一个unit的任务，如果可以，则使用`performUnitOfWork()`处理`nextUnitOfWork`

```javascript
const miniReact = {
    nextUnitOfWork: null,
    workLoop(deadline) {
        // 检测当前浏览器剩余时间是否能够执行一个unit的任务
        // 如果不能，则触发requestIdleCallback()等待浏览器的下一个空闲时间
        let shouldYield = false;
        while (this.nextUnitOfWork && !shouldYield) {
            // 剩余时间足够的前提下，执行performUnitOfWork()执行一个unit的任务
            this.nextUnitOfWork = this.performUnitOfWork(this.nextUnitOfWork);

            // 剩余时间足够的话：shouldYield=false
            shouldYield = deadline.timeRemaining() < 1;
        }

        // 如果剩余时间不够了，则调用requestIdleCallback等待浏览器有空闲时间再执行
        requestIdleCallback(this.workLoop);
    },
    render(element, container) {
        miniReact.nextUnitOfWork = {
            dom: container,
            props: {
                children: [element]
            }
        }
    }
}

const element = miniReact.createElement(
    "div",
    {id: "foo"},
    miniReact.createElement("a", null, "bar"),
    miniReact.createElement("b")
)
const container = document.getElementById("root")
miniReact.render(element, container);

// 调用requestIdleCallback等待浏览器有空闲时间再执行
requestIdleCallback(miniReact.workLoop);

```

而`performUnitOfWork()`方法的内容也非常明确，就是

- 执行每一个unit的任务：使用document创建新的DOM，使用`parent.dom.appendChild`新的DOM
- 找到下一个节点然后创建新的fiber：优先child节点然后sibling节点
- 返回新的fiber：返回新的fiber节点

```javascript
performUnitOfWork(fiber)
{
    // 执行每一个unit的任务：
    if (!fiber.dom) {
        fiber.dom = this.createDom(fiber);
    }

    if (fiber.parent) {
        fiber.parent.dom.appendChild(fiber.dom);
    }

    // 新的fiber先寻找它的children数据
    const elements = fiber.props.children;
    let index = 0;
    let prevSibling = null;

    while (index < elements.length) {
        const element = elements[i];

        const newFiber = {
            type: element.type,
            props: element.props,
            parent: fiber,
            dom: null
        }

        if (index === 0) {
            fiber.child = newFiber;
        } else {
            // 此时prevSibling是newFiber的左边元素
            prevSibling.sibling = newFiber;
        }

        prevSibling = newFiber;
        index++;
    }

    if (fiber.child) {
        return fiber.child;
    }

    let nextFiber = fiber;
    while (nextFiber) {
        // 新的fiber先寻找它的sibling数据
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        // 没有children，没有sibling，则直接找它的parent
        nextFiber = nextFiber.parent;
    }
}
```

# 4.Render and Commit Phases

在上面`performUnitOfWork()`的分析中，我们每次执行一个fiber任务都会进行DOM的添加，在需要创建DOM很多的情况下，需要多次浏览器帧才能完成所有的绘制任务，这会导致用户看到绘制不完整的DOM情况

因此我们最好的做法是在每一次`performUnitOfWork()`中不进行DOM的添加，等到最终任务都完成了，我们再进行DOM的添加

```javascript
performUnitOfWork(fiber)
{
    // 执行每一个unit的任务：
    if (!fiber.dom) {
        fiber.dom = this.createDom(fiber);
    }

    // if(fiber.parent) {
    //     fiber.parent.dom.appendChild(fiber.dom);
    // }

    // 新的fiber先寻找它的children数据
    const elements = fiber.props.children;
    let index = 0;
    let prevSibling = null;

    while (index < elements.length) {
        const element = elements[i];

        const newFiber = {
            type: element.type,
            props: element.props,
            parent: fiber,
            dom: null
        }

        if (index === 0) {
            fiber.child = newFiber;
        } else {
            // 此时prevSibling是newFiber的左边元素
            prevSibling.sibling = newFiber;
        }

        prevSibling = newFiber;
        index++;
    }

    if (fiber.child) {
        return fiber.child;
    }

    let nextFiber = fiber;
    while (nextFiber) {
        // 新的fiber先寻找它的sibling数据
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        // 没有children，没有sibling，则直接找它的parent
        nextFiber = nextFiber.parent;
    }
}
```

因此我们需要创建新的变量指向`Root`节点，然后所有任务完成后，再进行DOM的添加

```javascript
const miniReact = {
    wipRoot: null,
    render(element, container) {
        // 本来render()是进行DOM的创建！现在改为nextUnitOfWork的赋值
        // DOM的详细创建方法调用放在performUnitOfWork()中
        // DOM的详细创建方法放在createDOM()中
        this.wipRoot = {
            dom: container,
            props: {
                children: [element]
            }
        }
        this.nextUnitOfWork = this.wipRoot;
    },
    commitRoot() {
        this.commitWork(this.wipRoot.child);
        this.wipRoot = null;
    },
    commitWork(fiber) {
        if (!fiber) return;

        const domParent = fiber.parent.dom;
        domParent.appendChild(fiber.dom);
        this.commitWork(fiber.child);
        this.commitRoot(fiber.sibling);
    },
    workLoop(deadline) {
        // ...
        // 检测当前浏览器剩余时间是否能够执行一个unit的任务
        // 如果不能，则触发requestIdleCallback()等待浏览器的下一个空闲时间

        if (!this.nextUnitOfWork && this.wipRoot) {
            commitRoot();
        }

        // ...
        // 如果剩余时间不够了，则调用requestIdleCallback等待浏览器有空闲时间再执行
    },
}
```

# 5.Reconciliation

在上面的分析中，我们实现了初次渲染逻辑，接下来我们要实现渲染更新时的逻辑代码

每次渲染更新时，我们需要比对两次节点有何不同，因此我们需要使用新的变量`alternate`保留上一次的`fiber tree`

在这个环节中，我们需要实现

1. 在`performUnitOfWork()`中寻找新的fiber时检测旧的fiber能否复用的逻辑
2. `commitWork()`根据不同类型，新增/替换/删除进行对应的DOM操作
3. `commitWork()`处理事件类型的增加和删除逻辑

## 5.1 检测旧的fiber能否复用

```javascript
const miniReact = {
    deletions: [],
    // 还是按照child->sibling的顺序寻找新的fiber，只是会检测能否复用之前的DOM
    reconcileChildren(wipFiber, elements) {
        let index = 0;
        let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
        let prevSibling = null;

        while (index < elements.length) {
            const element = elements[i];

            const sameType = oldFiber && element && element.type === oldFiber.type;
            let newFiber = null;

            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: element.props,
                    dom: oldFiber.dom,
                    parent: wipFiber,
                    alternate: oldFiber,
                    efectTag: "UPDATE"
                }
            } else if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    parent: wipFiber,
                    alternate: null,
                    effectTag: "PLACEMENT"
                }
            } else if (oldFiber && !sameType) {
                oldFiber.effectTag = "DELETION";
                this.deletions.push(oldFiber);
            }


            if (index === 0) {
                wipFiber.child = newFiber;
            } else {
                // 此时prevSibling是newFiber的左边元素
                prevSibling.sibling = newFiber;
            }

            prevSibling = newFiber;
            index++;
        }
    },
    performUnitOfWork(fiber) {
        // 执行每一个unit的任务：
        //...

        const elements = fiber.props.children;
        // 区分:
        // 1.哪些能够复用
        // 2.哪些要删除
        // 3.哪些要重新创建
        this.reconcileChildren(fiber, elements);

        //...
    }
}
```

## 5.2 根据不同类型（新增/替换/删除）进行对应的DOM操作

```javascript
const miniReact = {
    commitWork(fiber) {
        if (!fiber) return;
        const domParent = fiber.parent.dom;
        // 以前这里只有新增的逻辑，现在我们要完善更新和删除逻辑
        if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
            // 新增逻辑
            domParent.appendChild(fiber.dom);
        } else if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
            this.updateDom(
                fiber.dom,
                fiber.alternate.props,
                fiber.props
            );
        } else if (fiber.effectTag === "DELETION") {
            domParent.removeChild(fiber.dom);
        }

        this.commitWork(fiber.child);
        this.commitRoot(fiber.sibling);
    },
    updateDom(dom, prevProps, nextProps) {
        const isProperty = key => key !== "children";
        const isGone = (prev, next) => key => !(key in next);
        const isAddOrUpdate = (prev, next) => key => prev[key] !== next[key];

        // 删除旧的props
        Object.keys(prevProps)
            .filter(isProperty)
            .filter(isGone(prevProps, nextProps))
            .forEach(name => {
                dom[name] = "";
            });

        // 赋值新的props
        Object.keys(nextProps)
            .filter(isProperty)
            .filter(isAddOrUpdate(prevProps, nextProps))
            .forEach(name => {
                dom[name] = nextProps[name];
            });
    }
}
```

## 5.3 处理特殊props（事件类型）的增加和删除逻辑

```javascript
const miniReact = {
    updateDom(dom, prevProps, nextProps) {
        const isProperty = key => key !== "children";
        const isGone = (prev, next) => key => !(key in next);
        const isAddOrUpdate = (prev, next) => key => prev[key] !== next[key];
        const isEvent = key => key.startsWith("on");
        // 特殊处理事件on
        Object.keys(prevProps)
            .filter(isEvent)
            .filter((key) => {
                return !(key in nextProps) || isAddOrUpdate(prevProps, nextProps)
            })
            .forEach(name => {
                // name=onClick onTouch等等
                const eventType = name.toLowerCase().substring(2);
                dom.removeEventListener(eventType, prevProps[name]);
            });
        //...

        // 特殊处理事件on
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isAddOrUpdate(prevProps, nextProps))
            .forEach(name => {
                const eventType = name.toLowerCase().substring(2);
                dom.addEventListener(eventType, nextProps[name]);
            })

        //...
    }
}
```

# 6. Function Component

在`React`中，还有一种`function components`，我们需要对这种类型的组件进行支持

```javascript
function App(props) {
    return miniReact.createElement(
        "h1",
        null,
        "Hi ",
        props.name
    )
}
```

上面的代码经过`babel`等工具转化之后代码为：

```javascript
const element = miniReact.createElement(App, {
    name: "foo",
})
```

`function components`有两个比较特殊的地方:

1. 函数组件对应的fiber没有真实的dom元素
2. 需要执行方法然后获取对应的children元素，而不是直接从props.children获取

## 6.1 获取children元素

因此我们需要检测是否是`function`类型的组件，然后另外进行处理

```javascript
  function performUnitOfWork(fiber) {
    // 执行每一个unit的任务：
    const isFunctionComponent = fiber.type instanceof Function;

    if (isFunctionComponent) {
        this.updateFunctionComponent(fiber);
    } else {
        this.updateHostComponent(fiber);
    }
}
```

如果是`function components`，直接通过执行方法获取对应的`children`

```javascript
function updateFunctionComponent(fiber) {
    const children = [fiber.type(fiber.props)];
    this.reconcileChildren(fiber, elements);
}
```

如果不是`function components`，则还是手动创建DOM

```javascript
function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = this.createDom(fiber);
    }
    const elements = fiber.props.children;
    // 区分哪些能够复用哪些要删除哪些要新增
    this.reconcileChildren(fiber, elements);
}
```

## 6.2 commitWork()获取fiber的parent必须拥有dom

```javascript
function commitWork(fiber) {
    if (!fiber) return;

    let domParentFiber = fiber.parent;
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent;
    }

    const domParent = domParentFiber.dom;
    //...
}
```

## 6.3 commitWork()删除操作时，fiber必须拥有dom

```javascript
function commitDelete(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom);
    } else {
        this.commitDelete(fiber.child, domParent);
    }
}
```

# 7. Hooks

`React`还支持`hooks`的使用，比如`useState()`

如下面代码块所示：
`useState`放在`function Component`中，`hooks`是跟`fiber`进行绑定，考虑最简单情况 只有一个`useXXX`，只有一个`function Component`，因此只需要一个`wipFiber`

```javascript
function Counter() {
    const [state, setState] = miniReact.useState(1)
    return (
        <h1 onClick={() => setState(c => c + 1)}>
            Count: {state}
        </h1>
    )
}
```

在`function Component`中初始化`wipFiber`和`hookIndex`

```javascript
function updateFunctionComponent(fiber) {
    // useState放在Component中，hooks是跟fiber进行绑定，考虑最简单情况
    // 只有一个useXXX，只有一个function Component，因此只需要一个wipFiber
    this.wipFiber = fiber;
    this.hookIndex = 0;
    this.wipFiber.hooks = [];

    const children = [fiber.type(fiber.props)];
    this.reconcileChildren(fiber, elements);
}
```


// TODO ???这一块怎么理解呢？得看看useHook的源码后才能明白它的做法
在`useState()`中进行`hook`的值初始化，然后

```javascript
function useState(initial) {
    // 是否之前就存在该hook
    const oldHook =
        this.wipFiber.alternate &&
        this.wipFiber.alternate.hooks &&
        this.wipFiber.alternate.hooks[this.hookIndex];
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: []
    }

    const setState = (action) => {
        hook.queue.push(action);

        // 模仿render()函数
        this.wipRoot = {
            dom: this.currentRoot.dom,
            props: this.currentRoot.props,
            alternate: this.currentRoot
        }
        this.nextUnitOfWork = this.wipRoot;
        this.deletions = [];
    }

    this.wipFiber.hooks.push(hook);
    this.hookIndex++;
    return [hook.state, setState];
}
```