const { merge } = require('webpack-merge')
const base = require('./webpack.base.js')

module.exports = merge(base, {
    mode: 'development', // 开发模式
    devServer: {
        open: true, // 编译完自动打开浏览器
        port: 8080,
    },
})
