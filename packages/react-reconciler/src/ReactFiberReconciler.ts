import { Fiber, FiberRoot } from "./ReactInternalTypes.ts";
import { ConcurrentRoot } from "./ReactRootTags.ts";
import { createFiberRoot } from "./ReactFiberRoot.ts";
import type { ReactNodeList } from "shared/ReactTypes";
import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop.ts";
import {
	createUpdate,
	enqueueUpdate,
	scheduleUpdateOnFiber,
	entangleTransitions,
} from "./ReactFiberClassUpdateQueue.ts";

function createContainer(container: any): FiberRoot {
	const tag = ConcurrentRoot;
	return createFiberRoot(container, tag);
}

function updateContainer(element: ReactNodeList, container: FiberRoot) {
	console.error("updateContainer", element, container);

	const current: Fiber = container.current as Fiber;
	const eventTime = requestEventTime();

	const lane = requestUpdateLane(current!);
	const update = createUpdate(eventTime, lane);
	update.payload = {};

	const root = enqueueUpdate(current, update, lane);
	if (root !== null) {
		scheduleUpdateOnFiber(root, current, lane, eventTime);
		entangleTransitions(root, current, lane);
	}

	return lane;
}

export { createContainer, updateContainer };
