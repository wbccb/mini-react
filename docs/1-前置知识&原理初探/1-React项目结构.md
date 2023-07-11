# React项目结构



- `react`: 宿主环境无关的公用方法
- `react-reconciler`: diff算法，协调器的实现
- `react-dom`: 宿主环境相关的包
- `shared`: 公共辅助方法，与宿主环境无关



## react

1. `jsx格式`转换为`React.createElment()/jsx方法/jsxDev方法`