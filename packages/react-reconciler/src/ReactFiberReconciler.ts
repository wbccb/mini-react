import { FiberRoot } from "./ReactInternalTypes.ts";
import { ConcurrentRoot } from "./ReactRootTags.ts";
import { createFiberRoot } from "./ReactFiberRoot.ts";

function createContainer(container: any): FiberRoot {
	const tag = ConcurrentRoot;
	return createFiberRoot(container, tag);
}

export { createContainer };
