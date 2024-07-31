import { createContainer } from "react-reconciler";
import type { FiberRoot } from "react-reconciler/src/ReactInternalTypes";
import { listenToAllSupportedEvents } from "../events/DOMPluginEventSystem.ts";
import type { ReactNodeList } from "shared/ReactTypes.ts";

export type RootType = {
	render(children: ReactNodeList): void;
	unmount(): void;
	_internalRoot: FiberRoot | null;
};

function ReactDOMRoot(internalRoot: FiberRoot) {
	this._internalRoot = internalRoot;
}

ReactDOMRoot.prototype.render = (dom: HTMLElement) => {
	console.log("ReactDOMRoot render", dom);
};

function createRoot(container: HTMLElement): RootType {
	var root = createContainer();
	listenToAllSupportedEvents(container);
	return new ReactDOMRoot(root);
}

export { createRoot };
