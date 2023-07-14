# React如何使用css

> 问题：className会重复

## 直接使用内联style
```jsx
<div style="{{color: 'green'}}"></div>
```

## 外链css文件可复用代码，可单独缓存文件
```js
import "index.css";
```

## 使用第三方库拼接className

### Classnames

有条件对`classname`进行集合处理


#### 安装

```shell
npm install classnames
```


#### 作用

如果没有`classnames`，我们需要手动对`css`的`class Name`进行拼接，比如

```js
class Button extends React.Component {
  // ...
  render () {
    var btnClass = 'btn';
    if (this.state.isPressed) btnClass += ' btn-pressed';
    else if (this.state.isHovered) btnClass += ' btn-over';
    return <button className={btnClass}>{this.props.label}</button>;
  }
}
```

上面这种方法非常容易出错，而使用`classnames`就可以使用对象或者表达式的模式拼接`css`的`class Name`

```js
var classNames = require('classnames');

class Button extends React.Component {
  // ...
  render () {
    var btnClass = classNames({
      btn: true,
      'btn-pressed': this.state.isPressed,
      'btn-over': !this.state.isPressed && this.state.isHovered
    });
    return <button className={btnClass}>{this.props.label}</button>;
  }
}
```


## 使用CSS Module

外链使用的方法是：
```js
import "index.css";
```

> 上面这种方法可以自由使用类名


> 使用`create-react-app`天然支持CSS Module，但是我们命令必须以`.module.css`显式告诉React是module类型

会自动对类名增加后缀，形式对应的Module


```js
import styles from "index.module.css";

<div className={styles['list-item']}></div>
```


## 使用Sass Module
> 使用`create-react-app`天然支持Sass Module

安装`sass`，然后将文件名改为`.module.scss`即可使用



## CSS-in-JS

一种解决方案，跟内联style不同，`CSS-in-JS`最终编译会形成一个class，因此可以进行复用

- `styled-component`
- `styled-jsx`
- `emotion`

> 上面三种方式的本质四项基本都是一样

### styled-component

可以使用`js`进行css的自由拼接


```js
const Button = styled.button`
    font-size: 12px;
    
  /* The GitHub button is a primary button
   * edit this to target it specifically! */
  ${props => props.$primary && css`
    background: var(--accent-color);
    color: black;
  `}
`


<Button></Button>
```

` styled.button`` `本质就是`styled.button()`


### styled-jsx

在`.ts`文件中限制较多，可以在`.js`中使用

```js
export default () => (
  <div className="root">
    <style jsx>{`
      .root {
        color: green;
      }
    `}</style>
  </div>
)
```


### emotion

在`.ts`文件中限制较多，可以在`.js`中使用


### 总结

- 优点： 使用JS，可以使用逻辑和变量，非常灵活
- 缺点： JSX和样式代码混合在一起，可读性变差，增加了编译成本

如果项目没有灵活使用CSS的需求，我们应该直接使用`CSS Module`的方式
