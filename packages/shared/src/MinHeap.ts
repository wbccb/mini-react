import { Lane, NoLane } from "react-reconciler";

type Heap = Array<Node>;
interface Task {
	id: number;
	callback: (params: any) => any;
	priorityLevel: Lane;
	startTime: number;
	expirationTime: number;
	sortIndex?: number;
}
type Node = Task;

class MinHeap {
	array: Heap;
	size: number;

	constructor() {
		this.array = [
			{
				id: 0,
				callback: () => {},
				priorityLevel: NoLane,
				startTime: 0,
				expirationTime: 0,
				sortIndex: 0,
			},
		];
		this.size = 0;
	}

	push(value: Node) {
		this.array.push(value);
		this.size++;
		this.shiftUp(this.size);
	}

	pop(): Node | undefined {
		if (this.size <= 0) {
			return undefined;
		}
		const res = this.array[1];
		// TODO 执行shiftDown()操作
		return res;
	}

	peek(): Node | undefined {
		if (this.size <= 0) {
			return undefined;
		}
		return this.array[this.size - 1];
	}

	shiftUp(i: number) {}
	shiftDown(i: number) {}

	swap(i: number, j: number) {
		const temp = this.array[i];
		this.array[i] = this.array[j];
		this.array[j] = temp;
	}
}

export { MinHeap };
export type { Task };
