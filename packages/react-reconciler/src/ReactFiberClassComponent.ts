import { Fiber } from "./ReactInternalTypes.ts";
import { Lanes } from "./ReactFiberLane.ts";
import { LayoutStatic, Update } from "./ReactFiberFlags.ts";

const classComponentUpdater = {
	isMounted() {},
	enqueueSetState() {},
	enqueueReplaceState() {},
	enqueueForceUpdate() {},
};

function constructClassInstance(workInProgress: Fiber, Component: any, props: any) {
	let context = {};
	let instance = new Component(props, context);
	adoptClassInstance(workInProgress, instance);
	return instance;
}

function adoptClassInstance(workInProgress: Fiber, instance: any) {
	instance.updater = classComponentUpdater;
	workInProgress.stateNode = instance;
}

function mountClassInstance(workInProgress: Fiber, Component: any, nextProps: any, lanes: Lanes) {
	const instance = workInProgress.stateNode;
	instance.props = nextProps;
	instance.state = workInProgress.memoizedState;

	if (typeof instance.componentDidMount === "function") {
		let fiberFlags = Update | LayoutStatic;
		workInProgress.flags |= fiberFlags;
	}
}

export { constructClassInstance, mountClassInstance, adoptClassInstance };
