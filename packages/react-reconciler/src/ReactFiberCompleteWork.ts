import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";

function completeWork(
	current: Fiber | null,
	workInProgress: Fiber,
	renderLanes: Lanes,
): Fiber | null {
	const newProps = workInProgress.pendingProps; // 存储了children数据！！可以看文章reconcileSingleElement()的分析

	switch (workInProgress.tag) {
	}

	throw new Error(
		`Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
			"React. Please file an issue.",
	);
}

export { completeWork };
