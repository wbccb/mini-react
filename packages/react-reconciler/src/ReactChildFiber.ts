function ChildReconciler(shouldTrackSideEffects: boolean) {}

const reconcileChildFibers = ChildReconciler(true);
const mountChildFibers = ChildReconciler(false);

export { reconcileChildFibers, mountChildFibers };
