export function addEventCaptureListener(
	target: EventTarget,
	eventType: string,
	listener: any,
): any {
	target.addEventListener(eventType, listener, true);
	return listener;
}

export function addEventBubbleListener(target: EventTarget, eventType: string, listener: any): any {
	target.addEventListener(eventType, listener, false);
	return listener;
}
