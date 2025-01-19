import { createRoot } from "react-dom/client";
import ClassComponentTest from "./ClassComponentTest";
import FunctionComponentTest from "./FunctionComponentTest";
import { Fragment } from "react";
const domNode = document.getElementById("root") as HTMLElement;
const root = createRoot(domNode);

// ----------------------测试多种数据初始化逻辑----------------------
// root.render(
// 	<div>
// 		<FunctionComponentTest testProps={"app-children-wrapper"} />
// 		<ClassComponentTest test={"我是ClassComponent"} />
// 		<Fragment>
// 			<Fragment>
// 				<span>我是Fragment里面的Child1</span>
// 			</Fragment>
// 			<p>Child2</p>
// 		</Fragment>
// 	</div>,
// );
// ----------------------测试多种数据初始化逻辑----------------------

// ======================测试多种数据初始化逻辑======================
