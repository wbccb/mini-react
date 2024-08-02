import {
	DefaultLane,
	IdleLane,
	InputContinuousLane,
	Lane,
	NoLane,
	SyncLane,
} from "./ReactFiberLane.ts";

export type EventPriority = Lane;

export const DiscreteEventPriority: EventPriority = SyncLane;
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
export const DefaultEventPriority: EventPriority = DefaultLane;
export const IdleEventPriority: EventPriority = IdleLane;

let currentUpdatePriority: EventPriority = NoLane;
export function getCurrentUpdatePriority(): EventPriority {
	return currentUpdatePriority;
}
