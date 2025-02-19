import { FiberNode } from "./ReactFiber";
import { FiberRootNode } from "./ReactFiberRoot";
import { Lanes } from "./ReactFiberLane";
import { ReactContext } from "shared";

export type FiberRoot = FiberRootNode;

export type Fiber = FiberNode;

export type ContextDependency = {
	context: ReactContext;
	next: ContextDependency | null;
	memoizedValue: any;
};
export type Dependencies = {
	lanes: Lanes;
	firstContext: ContextDependency | null;
};
