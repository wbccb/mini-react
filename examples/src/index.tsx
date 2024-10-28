import { createRoot } from "react-dom/client";
import App from "./App";
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
		<App testProps={"app-children-wrapper"} />
	</div>,
);
