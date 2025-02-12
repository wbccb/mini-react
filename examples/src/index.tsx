import { createRoot } from "react-dom/client";
import ClassComponentTest from "./components/ClassComponentTest";
import FunctionComponentTest from "./components/FunctionComponentTest";
import TestuseReducerAnduseState from "./hooks/useReducer_useState";
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

// ======================测试diff======================

const rootData = (
	<div id="我是最外层的">
		<TestuseReducerAnduseState />
	</div>
);

root.render(rootData);
// ======================测试diff======================
