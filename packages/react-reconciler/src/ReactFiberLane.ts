import { FiberRoot } from "./ReactInternalTypes";

export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;
// Lane values below should be kept in sync with getLabelForLane(), used by react-devtools-timeline.
// If those values are changed that package should be rebuilt and redeployed.

export const TotalLanes = 31;

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111111000000;
const TransitionLane1: Lane = /*                        */ 0b0000000000000000000000001000000;
const TransitionLane2: Lane = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane3: Lane = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane4: Lane = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane5: Lane = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane6: Lane = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane7: Lane = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane8: Lane = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane9: Lane = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane10: Lane = /*                       */ 0b0000000000000001000000000000000;
const TransitionLane11: Lane = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane12: Lane = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane13: Lane = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane14: Lane = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane15: Lane = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane16: Lane = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000111110000000000000000000000;
const RetryLane1: Lane = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2: Lane = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3: Lane = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4: Lane = /*                             */ 0b0000010000000000000000000000000;
const RetryLane5: Lane = /*                             */ 0b0000100000000000000000000000000;

export const SomeRetryLane: Lane = RetryLane1;

export const SelectiveHydrationLane: Lane = /*          */ 0b0001000000000000000000000000000;

const NonIdleLanes: Lanes = /*                          */ 0b0001111111111111111111111111111;

export const IdleHydrationLane: Lane = /*               */ 0b0010000000000000000000000000000;
export const IdleLane: Lane = /*                        */ 0b0100000000000000000000000000000;

export const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;

export function pickArbitraryLane(lanes: Lanes): Lane {
	return getHighestPriorityLane(lanes);
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane) {
	return (a & b) !== NoLanes;
}

export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane) {
	return (set & subset) === subset;
}

export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane) {
	return a | b;
}

export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
	return set & ~subset;
}

export function includesBlockingLane(root: FiberRoot, lanes: Lanes) {
	const SyncDefaultLanes =
		InputContinuousHydrationLane | InputContinuousLane | DefaultHydrationLane | DefaultLane;
	return (lanes & SyncDefaultLanes) !== NoLanes;
}

export function includesExpiredLane(root: FiberRoot, lanes: Lanes) {
	return (lanes & root.expiredLanes) !== NoLanes;
}

// ============================== 辅助方法 ==============================

// packages/react-reconciler/src/clz32.js
export const clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
const log = Math.log;
const LN2 = Math.LN2;
function clz32Fallback(x: number): number {
	const asUint = x >>> 0;
	if (asUint === 0) {
		return 32;
	}
	return (31 - ((log(asUint) / LN2) | 0)) | 0;
}

function pickArbitraryLaneIndex(lanes: Lanes) {
	return 31 - clz32(lanes);
}
function laneToIndex(lane: Lane) {
	return pickArbitraryLaneIndex(lane);
}

export function createLaneMap<T>(initial: T): LaneMap<T> {
	// Intentionally pushing one by one.
	// https://v8.dev/blog/elements-kinds#avoid-creating-holes
	const laneMap = [];
	for (let i = 0; i < TotalLanes; i++) {
		laneMap.push(initial);
	}
	return laneMap;
}

export function includesNonIdleWork(lanes: Lanes) {
	return (lanes & NonIdleLanes) !== NoLanes;
}
// ============================== 辅助方法 ==============================

export function markRootUpdated(root: FiberRoot, updateLane: Lane, eventTime: number) {
	// 包含了当前rootFiber树中所有待处理的update的lane(包含所有childFiber的update)，
	// 可以根据pendingLanes一定范围的取值去拿到当前优先级最高的lanes，然后赋值给renderLanes，
	// 后续遍历updateQueue时可以判断当前update是否就是renderLanes的值得到当前优先级最高的update更新对象
	root.pendingLanes |= updateLane;

	const eventTimes = root.eventTimes;
	const index = laneToIndex(updateLane);
	eventTimes[index] = eventTime;
}

export function markStarvedLanesAsExpired() {
	// 低优先级任务一直被高优先级任务打断，检查低优先级任务是否一直堵塞，强制转化为过期任务提高优先级
	// 检查root.pendingLanes是否存在lane一直没执行，将它从pendingLanes移动到root.expiredLanes
	// TODO 并发源码研究彻底后再来完善
}

function getHighestPriorityLanes(lanes: Lanes | Lane): Lanes {
	switch (getHighestPriorityLane(lanes)) {
		case SyncLane:
			return SyncLane;
		case InputContinuousHydrationLane:
			return InputContinuousHydrationLane;
		case InputContinuousLane:
			return InputContinuousLane;
		case DefaultHydrationLane:
			return DefaultHydrationLane;
		case DefaultLane:
			return DefaultLane;
		case TransitionHydrationLane:
			return TransitionHydrationLane;
		case TransitionLane1:
		case TransitionLane2:
		case TransitionLane3:
		case TransitionLane4:
		case TransitionLane5:
		case TransitionLane6:
		case TransitionLane7:
		case TransitionLane8:
		case TransitionLane9:
		case TransitionLane10:
		case TransitionLane11:
		case TransitionLane12:
		case TransitionLane13:
		case TransitionLane14:
		case TransitionLane15:
		case TransitionLane16:
			return lanes & TransitionLanes;
		case RetryLane1:
		case RetryLane2:
		case RetryLane3:
		case RetryLane4:
		case RetryLane5:
			return lanes & RetryLanes;
		case SelectiveHydrationLane:
			return SelectiveHydrationLane;
		case IdleHydrationLane:
			return IdleHydrationLane;
		case IdleLane:
			return IdleLane;
		case OffscreenLane:
			return OffscreenLane;
		default:
			return lanes;
	}
}

export function getNextLanes(root: FiberRoot, wipLanes: Lanes): Lanes {
	// TODO 比较复杂，后续完善
	let pendingLanes = root.pendingLanes;

	if (pendingLanes === NoLanes) {
		return NoLanes;
	}

	const nextLanes = getHighestPriorityLanes(pendingLanes);
	return nextLanes;
}

export function markRootFinished(root: FiberRoot, remainingLanes: Lane) {
	root.pendingLanes = remainingLanes;
	root.expiredLanes &= remainingLanes;
}
