import { Fiber } from "./ReactInternalTypes.ts";
import { Props } from "react-dom/client";
import { Lanes, NoLanes } from "./ReactFiberLane.ts";

let renderLanes: Lanes = NoLanes;
let currentlyRenderingFiber: Fiber | null = null;

function renderWithHooks(
	current: Fiber | null,
	workInProgress: Fiber,
	Component: (p: Props) => any,
	props: Props,
	nextRenderLanes: Lanes,
) {
	renderLanes = nextRenderLanes;
	currentlyRenderingFiber = workInProgress;

	workInProgress.memoizedState = null;
	workInProgress.lanes = NoLanes;

	const children = Component(props);

	renderLanes = NoLanes;
	currentlyRenderingFiber = null;

	return children;
}

export { renderWithHooks };
