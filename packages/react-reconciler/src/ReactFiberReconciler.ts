import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ConcurrentRoot } from "./ReactRootTags";
import { createFiberRoot } from "./ReactFiberRoot";
import type { ReactNodeList } from "shared";
import { requestEventTime, requestUpdateLane } from "./ReactFiberWorkLoop";
import {
	createUpdate,
	enqueueUpdate,
	scheduleUpdateOnFiber,
	entangleTransitions,
} from "./ReactFiberClassUpdateQueue";

function createContainer(container: any): FiberRoot {
	const tag = ConcurrentRoot;
	return createFiberRoot(container, tag);
}

function updateContainer(element: ReactNodeList, container: FiberRoot) {
	console.error("updateContainer", element, container);

	const current: Fiber = container.current as Fiber;
	const eventTime = requestEventTime();

	const lane = requestUpdateLane(current!); // 获取Fiber的lane
	const update = createUpdate(eventTime, lane); // 根据lane创建update
	update.payload = {};

	const root = enqueueUpdate(current, update, lane); // 将fiber对应的update放入到队列中
	if (root !== null) {
		scheduleUpdateOnFiber(root, current, lane, eventTime); // 处理队列
		entangleTransitions(root, current, lane); // 并发相关处理
	}

	return lane;
}

export { createContainer, updateContainer };
