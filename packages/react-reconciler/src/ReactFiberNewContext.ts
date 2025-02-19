import { ContextDependency, Fiber } from "./ReactInternalTypes";
import { includesSomeLane, Lanes } from "./ReactFiberLane";
import { ReactContext } from "shared";
import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork";

let currentlyRenderingFiber: Fiber | null = null;
let lastContextDependency: ContextDependency | null = null;
let lastFullyObservedContext: ReactContext | null = null;

export function prepareToReadContext(workInProgress: Fiber, renderLanes: Lanes) {
	currentlyRenderingFiber = workInProgress;
	lastContextDependency = null;
	lastFullyObservedContext = null;

	const dependencies = workInProgress.dependencies;
	if (dependencies !== null) {
		const firstContext = dependencies.firstContext;
		if (firstContext !== null) {
			if (includesSomeLane(dependencies.lanes, renderLanes)) {
				markWorkInProgressReceivedUpdate();
			}

			dependencies.firstContext = null;
		}
	}
}
