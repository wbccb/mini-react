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


> 使用`create-react-app`天然支持CSS Module

会自动对类名增加后缀，形式对应的Module

```js
import styles from "index.css";

<div className={styles['list-item']}></div>
```


## 使用Sass Module
> 使用`create-react-app`天然支持Sass Module

安装`sass`，然后将文件名改为`.scss`即可使用



## CSS-in-JS

一种解决方案，跟内联style不同

- `styled-component`


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


