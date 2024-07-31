import { createContainer } from "react-reconciler";
// @ts-ignore
import type { FiberRoot } from "react-reconciler/src/ReactInternalTypes";
import { listenToAllSupportedEvents } from "../events/DOMPluginEventSystem.ts";

export type RootType = ReactDOMRoot;
class ReactDOMRoot {
	private _internalRoot: FiberRoot;
	constructor(internalRoot: FiberRoot) {
		this._internalRoot = internalRoot;
	}

	render(dom: HTMLElement) {
		console.log("ReacteDOMRoot render", dom, this._internalRoot);
	}

	unmount() {}
}

function createRoot(container: HTMLElement): RootType {
	console.error("ReactDomRoot.ts createRoot", container);
	var root = createContainer();
	listenToAllSupportedEvents(container);
	return new ReactDOMRoot(root);
}

export { createRoot };
export default createRoot;
