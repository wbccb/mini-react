import { Fiber } from "./ReactInternalTypes";
import {NoFlags, Placement} from "./ReactFiberFlags";
import {HostRoot} from "./ReactWorkTags";

// 主要做两件事：
// 1. 判断fiber.return的最终值是不是HostRoot
// 2. 判断当前fiber.flags是不是Placement，如果是的话，向上寻找非Placement，返回值可以在其它方法中判断是否可以使用该DOM
export function getNearestMountedFiber(fiber: Fiber): null | Fiber {

  let node = fiber;
  let nearestMounted = fiber;

  if(node.alternate === null) {
    let nextNode: Fiber|null = node;
    do {
      node = nextNode;
      if((node.flags & Placement) !== NoFlags) {
        nearestMounted = node.return!;
      }
      nextNode = nextNode.return;
    }while(nextNode)
  } else {
    while(node.return) {
      node = node.return;
    }
  }

  if(node.tag === HostRoot) {
    return nearestMounted;
  }

  return null;
}
