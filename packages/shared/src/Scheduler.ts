import { Lane } from "react-reconciler";
function scheduleCallback(
	priorityLevel: Lane,
	callback: any,
	options?: Record<string, any>,
) {}

function cancelCallback(existingCallbackNode: any) {}

export { scheduleCallback, cancelCallback };
