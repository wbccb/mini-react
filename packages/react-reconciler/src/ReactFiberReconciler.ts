import { FiberRoot } from "./ReactInternalTypes.ts";
import { ConcurrentRoot } from "./ReactRootTags.ts";
import { createFiberRoot } from "./ReactFiberRoot.ts";
import type { ReactNodeList } from "shared/ReactTypes";
function createContainer(container: any): FiberRoot {
	const tag = ConcurrentRoot;
	return createFiberRoot(container, tag);
}

function updateContainer(element: ReactNodeList, container: any) {
	console.error("updateContainer", element, container);
}

export { createContainer, updateContainer };
