// function resolveDispatcher() {
//   const dispatcher = ReactCurrentDispatcher.current;
//   return ((dispatcher: any): Dispatcher);
// }
// export function useReducer<S, I, A>(
//   reducer: (S, A) => S,
//   initialArg: I,
//   init?: I => S,
// ): [S, Dispatch<A>] {
//   const dispatcher = resolveDispatcher();
//   return dispatcher.useReducer(reducer, initialArg, init);
// }
// function renderWithHooks() {
// 	ReactCurrentDispatcher$1.current =
// 		current === null || current.memoizedState === null
// 			? HooksDispatcherOnMount
// 			: HooksDispatcherOnUpdate;
// }

// 简化上面的代码为：
import { useReducer, useState } from "react-reconciler";

export { useReducer, useState };
