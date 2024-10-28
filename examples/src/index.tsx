import { createRoot } from "react-dom/client";
import ClassComponentTest from "./ClassComponentTest";
// import FunctionComponentTest from "./FunctionComponentTest";
// import { Fragment } from "react";
const domNode = document.getElementById("root") as HTMLElement;
const root = createRoot(domNode);
// const fragment = (
// 	<Fragment>
// 		<Fragment>
// 			<span>我是Fragment里面的Child1</span>
// 		</Fragment>
// 		<p>Child2</p>
// 	</Fragment>
// );

root.render(
	<div>
		{/*<FunctionComponentTest testProps={"app-children-wrapper"} />*/}
		<ClassComponentTest test={"我是ClassCOmponent"} />
	</div>,
);
