import { createRoot } from "react-dom/client";

const domNode = document.getElementById("root") as HTMLElement;
const root = createRoot(domNode);
root.render(
	<div id="parent">
		<span>我是Child1</span>
		Child2
	</div>,
);
