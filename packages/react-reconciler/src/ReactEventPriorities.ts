import {
	DefaultLane,
	getHighestPriorityLane,
	IdleLane,
	includesNonIdleWork,
	InputContinuousLane,
	Lane,
	Lanes,
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
export function isHigherEventPriority(
	a: EventPriority,
	b: EventPriority,
): boolean {
	return a !== 0 && a < b;
}
export function lanesToEventPriority(lanes: Lanes): EventPriority {
	const lane = getHighestPriorityLane(lanes);
	if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
		return DiscreteEventPriority;
	}
	if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
		return ContinuousEventPriority;
	}
	if (includesNonIdleWork(lane)) {
		return DefaultEventPriority;
	}
	return IdleEventPriority;
}
