export type ReactEmpty = null | void | boolean;
export type React$Node = any;

export type ReactNodeList = ReactEmpty | React$Node;

export type ReactProvider = {
	$$typeof: Symbol | number;
	type: ReactProviderType;
	key: null | string;
	ref: null;
	props: {
		value: any;
		children?: ReactNodeList;
		[key: string]: any;
	};
	[key: string]: any;
};

export type ReactProviderType = {
	$$typeof: Symbol | number;
	_context: ReactContext;
	[key: string]: any;
};

export type ReactConsumer = {
	$$typeof: Symbol | number;
	type: ReactContext;
	key: null | string;
	ref: null;
	props: {
		children: (value: any) => ReactNodeList;
		[key: string]: any;
	};
	[key: string]: any;
};

export type ReactContext = {
	$$typeof: Symbol | number;
	Consumer: ReactContext;
	Provider: ReactProviderType;
	_currentValue: any;
	_currentValue2: any;
	_threadCount: number;
	// DEV only
	_currentRenderer?: Object | null;
	_currentRenderer2?: Object | null;
	// This value may be added by application code
	// to improve DEV tooling display names
	displayName?: string;

	// only used by ServerContext
	_defaultValue: any;
	_globalName: string;
	[key: string]: any;
};
