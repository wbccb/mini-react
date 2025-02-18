import { REACT_CONTEXT_TYPE, REACT_PROVIDER_TYPE } from "shared";
import type { ReactContext } from "shared";

export function createContext(defaultValue: any) {
	const context: ReactContext = {
		$$typeof: REACT_CONTEXT_TYPE,
		_currentValue: defaultValue,

		// @ts-ignore
		Provider: null,
		// @ts-ignore
		Consumer: null,

		_defaultValue: null,
	};

	context.Provider = {
		$$typeof: REACT_PROVIDER_TYPE,
		_context: context,
	};

	context.Consumer = context;

	return context;
}
