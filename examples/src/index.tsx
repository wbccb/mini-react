import { createRoot } from "react-dom/client";
import ClassComponentTest from "./components/ClassComponentTest";
import FunctionComponentTest from "./components/FunctionComponentTest";
import TestuseReducerAnduseState from "./hooks/useReducer&useState";
import { TestUseEffectAndUseLayoutEffect } from "./hooks/useEffect&useLayoutEffect";
import { TestUseMemo } from "./hooks/useMemo&useCallback&useRef";
import { DiffDelete_insert } from "./diff/diff-delete_insert";
import { DiffMulti } from "./diff/diff-multi";
import TestUseContext from "./hooks/useContext";
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

// ======================测试useState和useReducer======================

// const rootData = (
// 	<div id="我是最外层的">
// 		<TestuseReducerAnduseState />
// 	</div>
// );
//
// root.render(rootData);
// ======================测试useState和useReducer======================

// ======================测试diff======================
// const rootData = (
// 	<div id="我是最外层的">
// 		<DiffDelete_insert />
// 		<DiffMulti />
// 	</div>
// );
//
// root.render(rootData);
// ======================测试diff======================

// ======================测试常见hooks======================
// const rootData = (
// 	<div id="我是最外层的">
// 		<TestUseEffectAndUseLayoutEffect />
// 		<TestUseMemo />
// 	</div>
// );
//
// root.render(rootData);
// ======================测试常见hooks======================

// ======================测试useContext======================
const rootData = (
	<div id="我是最外层的">
		<TestUseContext />
	</div>
);

root.render(rootData);
// ======================测试useContext======================
