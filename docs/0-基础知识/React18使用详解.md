# 基础知识点
## 1. JSX
### JSX是什么？
JSX是JavaScript的语法扩展，类似XML的描述方式，描述函数对象。而之所以不使用模板，是因为模板会分离技术栈，同时会引入更多的概念，就像Vue一样，会引入一些新的模板语法、模板指令等等，而JSX并不会引入新的概念，它就是一个JS。
### 为什么使用JSX？
JSX同时也是满足React的设计理念，即关注点分离。关注点分离是将计算机程序分隔为不同部分的设计原则，关注点分离使得解决特定领域问题的程序码从业务逻辑中独立出来，业务逻辑的程序码不再含有针对特定领域问题程序码的调用，业务逻辑同特定领域问题的关系通过侧面来封装、维护，当关注点分开时，各部分可以重复使用，独立开发和更新。
## 2. 类组件和函数组件
```jsx
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
const root = ReactDOM.createRoot(document.getElementById('root'));
const element = <Welcome name="Sara" />;
root.render(element);
```
```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
const root = ReactDOM.createRoot(document.getElementById('root'));
const element = <Welcome name="Sara" />;
root.render(element);
```
## 3. Props和Events
使用props从父组件传递到子组件，子组件可以使用props.name，props.clickFn()调用父组件的属性和方法
## 4. 生命周期
```jsx
class Clock extends React.Component {
  constructor(props) {
    super(props);
    // 响应式变化，只能在constructor中赋值，在其它地方只能使用setState()进行改变
    this.state = {date: new Date()};
  } 
  
  componentDidMount() {
    // 组件渲染完成后调用，类似于Vue的mounted生命周期
  }
  
  componentWillUnmount() {
    // 组件即将卸载时调用，类似于Vue的unmounted生命周期
  }
  
  render() {
    return (
      <div>
        <h1>Hello, world!</h1>
        <h2>It is {this.state.date.toLocaleTimeString()}.</h2>
      </div>
    );
  }
}
```
## 5. 条件编译
使用{}包裹着js相关的条件表达式进行组件的渲染
```jsx
<Title>{isRegister ? "请注册" : "请登录"}</Title>
{
  error?(
    <Typography.Text type={"danger"}>{error.message}</Typography.Text>
  ): null
}
{!isRegister ? <LoginScreen onError={setError}></LoginScreen>:<RegisterScreen onError={setError}></RegisterScreen>}
<Divider />
<Button type={"link"} onClick={() => setIsRegister(!isRegister)}>
  {isRegister ? "已经有账号了？直接登录" : "没有账号？注册新账号"}
</Button>
```
## 6. 列表渲染
```jsx
export const IdSelect = (props: IdSelectProps) => {
    // 重写<Select>组件
    const {value, onChange, options, defaultOptionName, ...resetProps} = props;

    return (
        <Select
            value={options?.length ? toNumber(value): 0}
            onChange={(value)=> (onChange(toNumber(value) || undefined))}
        >
            {
                defaultOptionName?(<Select.Option value={0}>{defaultOptionName}</Select.Option>):null
            }
            {
                options?.map((option) => {
                    return <Select.Option value={option.id} key={option.id}>{option.name}</Select.Option>
                })
            }
        </Select>
    )
}
```
## 7. 父子间通信

1. 父组件传递props到子组件中（变量+方法，子组件直接调用父组件的方法）
2. Refs是使用React.createRef()创建，并通过ref属性附加到React元素。在构建组件时，通常将Refs分配给实例属性，以便可以在整个组件中引用它们
```jsx
class MyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }
  render() {
    return <div ref={this.myRef} />;
  }
}
```
## 8. 路由跳转
```jsx
<BrowserRouter>
  <Routes>
    <Route path={"/projects"} element={<ProjectListScreen />} />
    <Route
      path={"/projects/:projectId/*"}
      element={<ProjectScreen />}
      />
    <Navigate to={"/projects"} />
  </Routes>
</BrowserRouter>
```
# 高级知识点
## 1. 全局Context
### (1) 创建useContext相关接口
```jsx
import React, {ReactNode, useState} from "react";
import {User} from "../screens/project-list/search-panel";
import * as auth from "../auth-provider";


interface AuthForm {
    username: string;
    password: string;
}


const AuthContext = React.createContext<{
    user: User|null,
    login: (form: AuthForm) => Promise<void>,
    register: (form: AuthForm) => Promise<void>,
    logout: ()=> Promise<void>
} | undefined>(undefined);
AuthContext.displayName = "AuthContext";


export const AuthProvider = ({children}: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (form: AuthForm) => auth.login(form).then(setUser);
    const register = (form: AuthForm) => auth.register(form).then(setUser);
    const logout = () => auth.logout().then(() => setUser(null));

    return (
        <AuthContext.Provider
            children={children}
            value={{user, login, register, logout}}
        />
    )
}


// 提供给子组件使用的方法：类似与Vue的inject
export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth必须在AuthProvider中使用");
    }
    return context;
}
```
### (2) 在main.ts中引入AuthContext.Provider，注册全局变量user和全局方法login、register、logout
```jsx
ReactDOM.render(
    <AuthProvider>
      <App/>
    </AuthProvider>,
  document.getElementById('root')
)
```
### (3) 在需要使用全局方法的地方使用useAuth
```jsx
const {login} = useAuth();
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const username = (event.currentTarget.elements[0] as HTMLInputElement).value;
  const password = (event.currentTarget.elements[1] as HTMLInputElement).value;
  login({username, password});
}
```
## 2. Refs绑定Dom对象
### (1) React.forwardRef
封装ref的传递，实现ref的向下传递，FancyButton可以获取父组件传来的ref然后赋值到`<button>`中

```jsx
const FancyButton = React.forwardRef((props, ref) => (
  <button ref={ref} className="FancyButton">
    {props.children}
  </button>
));

// You can now get a ref directly to the DOM button:
const ref = React.createRef();
// ref.current就是<button>的对象
<FancyButton ref={ref}>Click me!</FancyButton>;
```
## 3. 状态提升
使用React经常会遇到几个组件需要共用状态数据的情况，在这种情况下，我们最好将这部分共享的状态提升至他们最近的父组件当中进行管理。这样所有子组件的数据都是来自他们最近的父组件，由父组件进行统一存储和修改，然后传入到子组件中。
## 4. redux或者Mobx(非useContext和状态提升的另一种全局状态管理)
### (1) redux
#### 概念
跟Vuex类似，使用叫做"action"的事件来管理和更新应用状态的模式和工具库。它以集中式Store的方式对整个应用中使用的状态进行集中管理，其规则保证状态只能以可预测的方式更新。
#### 其它工具包
##### React-Redux[#](http://cn.redux.js.org/tutorials/essentials/part-1-overview-concepts#react-redux)
Redux 可以集成到任何的 UI 框架中，其中最常见的是 React 。[React-Redux](https://react-redux.js.org/) 是我们的官方包，它可以让 React 组件访问 state 和下发 action 更新 store，从而同 Redux 集成起来。
##### Redux Toolkit[#](http://cn.redux.js.org/tutorials/essentials/part-1-overview-concepts#redux-toolkit)
[Redux Toolkit](https://redux-toolkit.js.org/) 是我们推荐的编写 Redux 逻辑的方法。 它包含我们认为对于构建 Redux 应用程序必不可少的包和函数。 Redux Toolkit 构建在我们建议的最佳实践中，简化了大多数 Redux 任务，防止了常见错误，并使编写 Redux 应用程序变得更加容易。
##### Redux DevTools 扩展[#](http://cn.redux.js.org/tutorials/essentials/part-1-overview-concepts#redux-devtools-%E6%89%A9%E5%B1%95)
[Redux DevTools 扩展](https://github.com/zalmoxisus/redux-devtools-extension) 可以显示 Redux 存储中状态随时间变化的历史记录。这允许您有效地调试应用程序，包括使用强大的技术，如“时间旅行调试”。
#### 使用示例
```jsx
// 如何使用 createSlice 将 reducer 逻辑的“切片”添加到 Redux store
// 使用 useSelector 钩子（hooks）读取组件中的 Redux 数据
// 使用 useDispatch 钩子在组件中 dispatch action
```

1. 使用toolkit创建切片
```jsx
import { createSlice } from '@reduxjs/toolkit'

const initialState = [
  { id: '1', title: 'First Post!', content: 'Hello!' },
  { id: '2', title: 'Second Post', content: 'More text' }
]

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {}
})

export default postsSlice.reducer;
```

2. 将toolkit创建的切片存储到Redux store中
```jsx
import { configureStore } from '@reduxjs/toolkit'

import postsReducer from '../features/posts/postsSlice'

export default configureStore({
  // 可以创建多个切片
  reducer: {
    posts: postsReducer
    // users: userReducer
    // comments: commentReducer
  }
})
```

3. 使用useSelector获取state的值，类似于Vue的mapGetters
```jsx
const posts = useSelector(state => state.posts)

// 我们也可以在createSlice中创建function，useSelector直接调用，比如

// slice.js
export const selectAllPosts = state => state.posts;
export const selectPostById = (state, postId) =>
  state.posts.find(post => post.id === postId);

// 调用的地方
const posts = useSelector(selectAllPosts)
const post = useSelector(state => selectPostById(state, postId))


```

4. 在切片createSlice中创建对应的action方法，使用useDispatch()进行action方法的调用
```jsx
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    postAdded(state, action) {
      state.push(action.payload)
    }
  }
})

export const { postAdded } = postsSlice.actions

export default postsSlice.reducer
```
```jsx
const dispatch = useDispatch()

 const onSavePostClicked = () => {
    if (title && content) {
      dispatch(
        postAdded({
          id: nanoid(),
          title,
          content
        })
      )
    }
}
```

5. 使用Reduc thunk中间件(最常用的异步中间件)处理异步逻辑(Redux Toolkit已经集中该中间件)

从下面的例子可以看出，useDispatch调用跟普通的actions没有什么区别，区别在于createSlice的时候要使用createAsyncThunk进行显示声明
```jsx
import { createSlice, nanoid, createAsyncThunk } from '@reduxjs/toolkit'
import { client } from '../../api/client'

const initialState = {
  posts: [],
  status: 'idle',
  error: null
}

export const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  const response = await client.get('/fakeApi/posts')
  return response.data
})
```
```jsx
  const dispatch = useDispatch()
  const posts = useSelector(selectAllPosts)

  const postStatus = useSelector(state => state.posts.status)

  useEffect(() => {
    if (postStatus === 'idle') {
      dispatch(fetchPosts())
    }
  }, [postStatus, dispatch])
```

6. 使用Reduc thunk中间件异步请求后，根据请求结果，更新store的状态
```jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

import { client } from '../../api/client'

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { getState }) => {
    const allNotifications = selectAllNotifications(getState())
    const [latestNotification] = allNotifications
    const latestTimestamp = latestNotification ? latestNotification.date : ''
    const response = await client.get(
      `/fakeApi/notifications?since=${latestTimestamp}`
    )
    return response.notifications
  }
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: [],
  reducers: {},
  extraReducers: {
    [fetchNotifications.fulfilled]: (state, action) => {
      state.push(...action.payload)
      // Sort with newest first
      state.sort((a, b) => b.date.localeCompare(a.date))
    }
  }
})

export default notificationsSlice.reducer

export const selectAllNotifications = state => state.notifications
```
# 常见的hooks
## 1. useState

> 如果我们不需要在`jsx`中使用响应式变量的话，就不要使用`useState`管理它

```jsx
const [state, setState] = useState({});
setState(prevState => {
  // 合并之前的对象，如果不需要合并，可以直接使用setState({xxxxx});
  return {...prevState, ...updatedValues};
});
```
useState也支持异步初始化值，如果初始化的值需要进行复杂的计算，那么可以使用函数进行初始化，后续的setState更新会忽略该function的执行，useState会在整个DOM渲染时只渲染一次，因此这个初始化function也只会执行一次
```jsx
const [state, setState] = useState(() => {
  const initialState = someExpensiveComputation(props);
  return initialState;
});
```

### state的特点

#### 异步更新

由于异步更新，因此`setCount()`之后马上打印`count`不能马上拿到最新的值

```js
const [count, setCount] = useState(1);
function test() {
    setCount(count+1);
    console.log("目前的count", count);
}
```

#### 渲染合并

就算我们执行多次`setCount()`，由于异步更新，因此多次`setCount()`的`count`都是一样的！

```js
const [count, setCount] = useState(1);
function test() {
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
}
```

为了让每次更新都能拿到最新的值，我们可以改为方法的模式，即
```jsx
const [count, setCount] = useState(1);
function test() {
    setCount((count)=> count+1);
    setCount((count)=> count+1);
    setCount((count)=> count+1);
    setCount((count)=> count+1);
    setCount((count)=> count+1);
}
```

#### 不可变数据

不可以直接改变count，即`count=count+2`，而必须通过`setCount()`传入一个新的值

```js
const [count, setCount] = useState(1);
function test() {
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
    setCount(count+1);
}
```


### 使用immer + useState

代替`setState`进行数据的管理，可以解决不可变数据每次都得传入一个新的值的问题

> 有时候会忘记传入新的值，可能没有进行旧的值的一些属性的合并

```js
import React, { useCallback, useState } from "react";
import {produce} from "immer";

const TodoList = () => {
    const [todos, setTodos] = useState([
        {
            id: "React",
            title: "Learn React",
            done: true
        },
        {
            id: "Immer",
            title: "Try Immer",
            done: false
        }
    ]);

    const handleToggle = useCallback((id) => {
        setTodos(
            produce((draft) => {
                const todo = draft.find((todo) => todo.id === id);
                todo.done = !todo.done;
            })
        );
    }, []);

    const handleAdd = useCallback(() => {
        setTodos(
            produce((draft) => {
                draft.push({
                    id: "todo_" + Math.random(),
                    title: "A new todo",
                    done: false
                });
            })
        );
    }, []);

    return (<div>{*/ See CodeSandbox */}</div>)
}
```


## 2. useEffect

> React18开始，`useEffect()`在`开发环境下`会执行两次，是为了提早检测`useEffect()`是否写的有问题，有没有正确写对应的销毁函数！免得生产环境报错


> React18，生产环境只会触发一次`useEffect()`

```jsx
export const useMount = (callback)=>{
    useEffect(()=>{
        // 将[]这一步都省略了，同时制造了非常好的语义化的表达，使用useMount表示方法只会执行一次，并且在mounted中执行
        callback();
    }, []);
}
```
```jsx
export const useDebounce = <V>(value: V, delay?: number) => {

    const [debounceValue, setDebounceValue] = useState(value);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebounceValue(value)
        }, delay);

        return () => {
            // return这个方法，当有多个useEffect排队的时候，会先调用这个方法，然后再执行新的useEffect
            // 类似Vue的watchEffect的效果，会先清除副作用，也就是每次value和delay发生变化时，都会先调用该function，进行timeout的清除，然后再进行const timeout = setTimeout(()=>{xxxx})的调用
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }, [value, delay]);

    return debounceValue;
};
```
## 3. useContext
创建全局的对象，类似于Vue的inject和provide，可以看高级知识点的1.全局Context
## 4. useMemo和useCallback
### (1) 使用上面两个hook方法的原因：对象不断重新创建
```jsx
function Foo({bar, baz}) {
  const options = {bar, baz}
  React.useEffect(() => {
    buzz(options)
  }, [options]) // we want this to re-run if bar or baz change
  return <div>foobar</div>
}

function Blub() {
  return <Foo bar="bar value" baz={3} />
}
```
这里有问题的原因是因为 useEffect 将对每次渲染中对 options 进行引用相等性检查，并且由于JavaScript的工作方式，每次渲染 options 都是新的，所以当React测试 options 是否在渲染之间发生变化时，它将始终计算为 true，意味着每次渲染后都会调用 useEffect 回调，而不是仅在 bar 和 baz 更改时调用。
**针对上面的代码，我们做的改进是**
```jsx
function Foo({bar, baz}) {
  React.useEffect(() => {
    const options = {bar, baz}
    buzz(options)
  }, [bar, baz])
  return <div>foobar</div>
}

function Blub() {
  const bar = React.useCallback(() => {}, [])
  const baz = React.useMemo(() => [1, 2, 3], [])
  return <Foo bar={bar} baz={baz} />
}
```
使用了React.useCallback和React.useMemo后，我们每次重新渲染Blub()的时候，就不会重新建立bar和baz了，因此也不会触发useEffect里面方法的重新执行
### (2) 使用上面两个hook方法的原因：昂贵的计算
```jsx
function RenderPrimes({iterations, multiplier}) {
  const primes = calculatePrimes(iterations, multiplier)
  return <div>Primes! {primes}</div>
}
```
**针对上面的代码，我们做的改进是**
```jsx
function RenderPrimes({iterations, multiplier}) {
  const primes = React.useMemo(() => {
    return calculatePrimes(iterations, multiplier);
  }, [iterations,multiplier]);
  return <div>Primes! {primes}</div>
}
```
使用了useMemo后，每次重新渲染RenderPrimes时就不会重新创建primes对象，也不会重新执行一遍�耗时的calculatePrimes()方法
## 6. useRef和createRef


### (1) 不同点
- useRef创建的对象在每一次组件重新渲染时都不会重新创建，一直保持着原有对象的引用
- createRef创建的对象在每一次组件重新渲染时都会重新执行一次，重新创建一个新的ref对象
### (2) 相同点
用于对子组件的引用
```jsx
function TextInputWithFocusButton() {
  const inputEl = useRef(null);
  const onButtonClick = () => {
    // `current` 指向已挂载到 DOM 上的文本输入元素
    inputEl.current.focus();
  };
  return (
    <>
      <input ref={inputEl} type="text" />
      <button onClick={onButtonClick}>Focus the input</button>
    </>
  );
}
```

### useRef

`useRef`也可以用于普通的JS变量，但是不会触发`render()`，比如下面改变了`nameRef`的值不会触发界面的重新渲染

```js
const nameRef = useRef("test");
function changeName () {
    nameRef.current = "test11";
}

return <p>{nameRef.current}</p>
```

## 7. useSearchParams以及常见用法
// TODO

# 常见的第三方库
## 1. react-query
对网络请求进行封装的一个库，这个库将帮助你获取、同步、更新和缓存你的远程数据，提供简单的hooks，就能完成增删查改等操作。我们有了react-query，就不用使用useReduce，繁杂的配置，维护全局状态，只要知道如何使用Promise，传递一个可解析的函数即可。

### 与useSearchParams结合的常见用法
// TODO
