# 状态管理多种模式

状态管理，主流的状态管理有`Redux`、`Mobx`、`Vuex`


## 状态提升Context

使用`Context`，可以跨级传递，不用使用props层层传递，类似于vue3的`provide/inject`

### 应用场景
- 切换主题
- 切换语言

### 简单示例

- 创建context: createContext
- 使用context: useContext

> parentComponent传入一个theme，可以在深层嵌套中使用useContext获取theme

```js
// const SomeContext = createContext(defaultValue)
import { createContext } from 'react';
const ThemeContext = createContext('light');
function App() {
    const [theme, setTheme] = useState('light');
    // ...
    return (
        <ThemeContext.Provider value={theme}>
            <Page />
        </ThemeContext.Provider>
    );
}

function Button() {
    const theme = useContext(ThemeContext);
    return <button className={theme} />;
}
```


## useReducer

- useState的代替方案
- 数据结构简单使用useState，复杂时使用useReducer
- 简化版本的redux
- 还得使用Context传递state和dispatch才能解决跨组件的问题，也就是说useReducer只是一种数据存取的方案，并不具备跨组件传递的功能，而且useReducer也不具备模块化的功能

> 相比较vue来说，`useReducer`听起来就非常鸡肋.....不适合复杂项目，还是得用redux

> 先有redux，然后才有useReducer

```js
import { useReducer } from 'react';

function reducer(state, action) {
  if (action.type === 'incremented_age') {
    return {
      age: state.age + 1
    };
  }
  throw Error('Unknown action.');
}

export default function Counter() {
  const [state, dispatch] = useReducer(reducer, { age: 42 });

  return (
    <>
      <button onClick={() => {
        dispatch({ type: 'incremented_age' })
      }}>
        Increment age
      </button>
      <p>Hello! You are {state.age}.</p>
    </>
  );
}
```





## Redux

- 具有state/store
- action
- dispatch
- reducer

### 与useReducer的区分

- 默认支持跨组件通讯
- 可拆分模块
- Context+useReducer：在简单场景，可以替代Redux，直接使用Context+useReducer


### 步骤

- createSlice: 创建模块，进行不同type的`function`的构建（返回一个新的state），然后对这些`function`进行`export`
- 使用`configureStore()`进行模块的统一管理，输出一个`reducer`
- 在根元素进行`<Provider store={xx}`的包裹，此时的`xx`就是`configureStore()`输出的`reducer`
- 在子元素中，使用`useSelect()`获取对应的`state.模块`，使用`useDispatch()`获取`dispatch`，然后进行`dispatch(fn1)`，这个`fn1`就是`createSlice()`创建的`function`


### Redux Toolkit and Immer

> https://redux-toolkit.js.org/usage/immer-reducers#reducers-and-immutable-updates

1. Redux Toolkit的createSlice本质使用createReducer, createReducer内部自动使用immer，因此可以直接操作state 
```js
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    todoAdded(state, action) {
      state.push(action.payload)
    },
  },
})
```
2. 也可以直接return一个值，会自动替换旧的值
```js
const initialState = []
const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    brokenTodosLoadedReducer(state, action) {
      // ❌ ERROR: does not actually mutate or return anything new!
      state = action.payload
    },
    fixedTodosLoadedReducer(state, action) {
      // ✅ CORRECT: returns a new value to replace the old one
      return action.payload
    },
    correctResetTodosReducer(state, action) {
      // ✅ CORRECT: returns a new value to replace the old one
      return initialState
    },
  },
})
```
3. 使用`current`进行`Proxy`数据的解构

```js
import { current } from '@reduxjs/toolkit'
const todosSlice = createSlice({
  name: 'todos',
  initialState: todosAdapter.getInitialState(),
  reducers: {
    todoToggled(state, action) {
      // ❌ ERROR: logs the Proxy-wrapped data
      console.log(state)
      // ✅ CORRECT: logs a plain JS copy of the current data
      console.log(current(state))
    },
  },
})
```

### Redux DevTools

谷歌插件，可以进行数据的变化



## MobX

MobX+React就是一个繁重的Vue，MobX是一套单独的观察者模式，有一个独立的state+声明式的观察者和被观察者
- Observable: 类似于Vue3的响应式Proxy对象，可以监听某个属性/监听整个对象，可以设置为整个store对象（主要分为`action`、`computed`、`observable`）
- observer: 观察者，类似于Vue3的effect，可以包裹函数组件，进行`const ComponenName: FC<> = observer(()=> {})`

流程：
1. 组件函数声明为`observer`
2. 根组件传递`Observable`过的`store对象`，主要`store对象`发生变化，则触发`observer`包裹的组件重新渲染
> `store对象`可以跟vue3一样，进行`store.data1.push()`这样直接的操作




