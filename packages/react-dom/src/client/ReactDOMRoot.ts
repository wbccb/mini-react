import { createContainer, updateContainer } from "react-reconciler";
//
import type { FiberRoot } from "react-reconciler/src/ReactInternalTypes";
import { listenToAllSupportedEvents } from "../events/DOMPluginEventSystem";
import { ReactNodeList } from "shared";
import { markContainerAsRoot } from "./ReactDOMComponentTree";
export type RootType = ReactDOMRoot;
class ReactDOMRoot {
	private _internalRoot: FiberRoot;
	constructor(internalRoot: FiberRoot) {
		this._internalRoot = internalRoot;
	}

	render(children: ReactNodeList) {
		const root = this._internalRoot;
		updateContainer(children, root);
	}

	unmount() {}
}

function createRoot(container: HTMLElement): RootType {
	console.error("ReactDomRoot.ts createRoot", container);
	var root = createContainer(container);
	markContainerAsRoot(root.current!, container);
	listenToAllSupportedEvents(container);
	return new ReactDOMRoot(root);
}

export { createRoot };
export default createRoot;
