import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default {
	entry: path.resolve(__dirname, "../src/index.tsx"),
	output: {
		path: path.resolve(__dirname, "../dist"), // 打包后的代码放在dist目录下
		filename: "[name].[hash:8].js", // 打包的文件名
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "../public/index.html"), // 模板取定义root节点的模板
			inject: true, // 自动注入静态资源
		}),
	],
	resolve: {
		// 配置 extensions 来告诉 webpack 在没有书写后缀时，以什么样的顺序去寻找文件
		extensions: [".ts", ".tsx", ".mjs", ".js", ".json", ".jsx"], // 如果项目中只有 tsx 或 ts 可以将其写在最前面
	},
	module: {
		rules: [
			{
				test: /.(jsx?)|(tsx?)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							["@babel/preset-env"],
							["@babel/preset-typescript"],
							[
								"@babel/preset-react",
								{
									"runtime": "automatic",
								},
							],
						],
					},
				},
			},
		],
	},
};
