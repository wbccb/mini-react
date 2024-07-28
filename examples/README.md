# 首次渲染-初始化

1. `packages`使用`vite`+`rollup`的模式进行打包
2. `examples`使用`webpack5`的模式进行打包，引入`ReactRouter`的形式进行示例的切换

## 开发步骤
1. `examples`使用`webpack5`集成`react18`相关api运行成功
2. `examples`将`react18`相关api替换为`packages`相关api，实现逐步替换

## webpack5+react项目初始化配置

1. 下载依赖：`react`、`react-dom`、`babel`、`typescript`、`webpack`、`webpack-cli`
2. 初始化配置文件`tsconfig.json`
3. 初始化webpack打包文件`webpack.xxx.js`
4. 构建基础文件`index.html`、`App.tsx`、`index.tsx`
