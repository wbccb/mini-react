import { merge } from "webpack-merge";
import base from "./webpack.base.js";
export default {
	...merge(base, {
		mode: "development", // 开发模式
		devServer: {
			open: true, // 编译完自动打开浏览器
			port: 8080,
		},
		module: {
			rules: [
				{
					test: /\.m?js/,
					resolve: {
						fullySpecified: false,
					},
				},
			],
		},
	}),
};
