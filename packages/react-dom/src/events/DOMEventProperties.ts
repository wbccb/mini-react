/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type { DOMEventName } from "./DOMEventNames";

import { registerTwoPhaseEvent } from "./EventRegistry";

export const topLevelEventsToReactNames: Map<DOMEventName, string | null> = new Map();

// NOTE: Capitalization is important in this list!
//
// E.g. it needs "pointerDown", not "pointerdown".
// This is because we derive both React name ("onPointerDown")
// and DOM name ("pointerdown") from the same list.
//
// Exceptions that don't match this convention are listed separately.
//
// prettier-ignore
const simpleEventPluginEvents = [
  'abort',
  'auxClick',
  'cancel',
  'canPlay',
  'canPlayThrough',
  'click',
  'close',
  'contextMenu',
  'copy',
  'cut',
  'drag',
  'dragEnd',
  'dragEnter',
  'dragExit',
  'dragLeave',
  'dragOver',
  'dragStart',
  'drop',
  'durationChange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'gotPointerCapture',
  'input',
  'invalid',
  'keyDown',
  'keyPress',
  'keyUp',
  'load',
  'loadedData',
  'loadedMetadata',
  'loadStart',
  'lostPointerCapture',
  'mouseDown',
  'mouseMove',
  'mouseOut',
  'mouseOver',
  'mouseUp',
  'paste',
  'pause',
  'play',
  'playing',
  'pointerCancel',
  'pointerDown',
  'pointerMove',
  'pointerOut',
  'pointerOver',
  'pointerUp',
  'progress',
  'rateChange',
  'reset',
  'resize',
  'seeked',
  'seeking',
  'stalled',
  'submit',
  'suspend',
  'timeUpdate',
  'touchCancel',
  'touchEnd',
  'touchStart',
  'volumeChange',
  'scroll',
  'toggle',
  'touchMove',
  'waiting',
  'wheel',
];

function registerSimpleEvent(domEventName: DOMEventName, reactName: string) {
	topLevelEventsToReactNames.set(domEventName, reactName);
	registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents() {
	for (let i = 0; i < simpleEventPluginEvents.length; i++) {
		const eventName = simpleEventPluginEvents[i] as any as string;
		const domEventName = eventName.toLowerCase() as any as DOMEventName;
		const capitalizedEvent = eventName[0].toUpperCase() + eventName.slice(1);
		registerSimpleEvent(domEventName, "on" + capitalizedEvent);
	}
	// Special cases where event names don't match.
	registerSimpleEvent("dblclick", "onDoubleClick");
	registerSimpleEvent("focusin", "onFocus");
	registerSimpleEvent("focusout", "onBlur");
}
