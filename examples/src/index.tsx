import { createRoot } from "react-dom/client";
// import App from "./App";

const domNode = document.getElementById("root");
const root = createRoot(domNode!);
root.render(
	<div>
		<span>
			<input />
		</span>
	</div>,
);
