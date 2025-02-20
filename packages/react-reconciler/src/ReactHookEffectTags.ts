/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type HookFlags = number;

export const HookNoFlags = /*   */ 0b0000;

// Represents whether effect should fire.
export const HookHasEffect = /* */ 0b0001;

// Represents the phase in which the effect (not the clean-up) fires.
export const HookInsertion = /*  */ 0b0010;
export const HookLayout = /*    */ 0b0100;
export const HookPassive = /*   */ 0b1000;
