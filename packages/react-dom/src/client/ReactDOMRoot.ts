import { createContainer, updateContainer } from "react-reconciler";
// @ts-ignore
import type { FiberRoot } from "react-reconciler/src/ReactInternalTypes";
import { listenToAllSupportedEvents } from "../events/DOMPluginEventSystem.ts";
import { ReactNodeList } from "shared/ReactTypes.ts";
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
	listenToAllSupportedEvents(container);
	return new ReactDOMRoot(root);
}

export { createRoot };
export default createRoot;
