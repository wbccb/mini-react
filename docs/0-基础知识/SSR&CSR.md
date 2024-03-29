# SSR
> 服务端渲染

## 基本原理

1. 返回的就是一个最终的HTML网页

## 优点
1. 性能好
2. 易于SEO搜索

## 缺点
1. 开发成本高

## 应用环境
1. 对性能要求高的系统，如弱网环境、移动端
2. 操作交互较简单的系统
3. B端（不需要SEO优化）不太适合用SSR


## 常见框架
1. Next.js: React
2. Nuxt.js: Vue
3. Nest.js: 纯后端框架


## Next.js
### pre-render

1. `Static Generation`: 直接生成完整的HTML文件
2. `Server-side rendering`: 每次请求时动态生成HTML文件（一般是需要到数据库中获取数据进行整合到HTML）

# CSR
> 客户端渲染


## 基本原理

1. 服务端返回HTML文件
2. 客户端获取对应的CSS文件+JS文件+JSON数据，最终使用JS渲染出来最终的HTML网页


## 缺点

1. 需要多次网络请求，渲染速度慢