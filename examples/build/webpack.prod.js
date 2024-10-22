import { merge } from "webpack-merge";
import base from "./webpack.base.js";
export default {
	...merge(base, {
		mode: "production", // 开发模式
	}),
};
