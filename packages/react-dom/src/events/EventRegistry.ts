import type { DOMEventName } from "./DOMEventNames";

export const allNativeEvents: Set<DOMEventName> = new Set();

let registrationNameDependencies: Record<string, Array<DOMEventName>> = {};

export function registerTwoPhaseEvent(
	registrationName: string,
	dependencies: Array<DOMEventName>,
): void {
	registerDirectEvent(registrationName, dependencies);
	registerDirectEvent(registrationName + "Capture", dependencies);
}

function registerDirectEvent(registrationName: string, dependencies: Array<DOMEventName>) {
	registrationNameDependencies[registrationName] = dependencies;

	for (var i = 0; i < dependencies.length; i++) {
		allNativeEvents.add(dependencies[i]);
	}
}
