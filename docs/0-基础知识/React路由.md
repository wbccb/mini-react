# React路由

## 安装
```shell
npm install react-router-dom -D
```


## 跳转

```js
import {useNavigate, Link} from "react-router-dom";

nav(-1);
nav("/login");
nav({
    pathname: "/login",
    search: "type=123"
});

<Link to="/login?type=123"></Link>
```



## 获取动态路由的params

比如`edit/:id`这个导航，我们可以进行`edit/123`跳转，然后使用`useParams`获取`id=123`

```js
import {useParams} from "react-router-dom";
const {id} = useParams();
```


## 获取query

比如`edit`这个导航，我们可以进行`edit?type=123`跳转，然后使用`useSearchParams`获取`type=123`


```js
import {useSearchParams} from "react-router-dom";

const [searchParams] = useSearchParams();
const type = searchParams.get("type");
```

