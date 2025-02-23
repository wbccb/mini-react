type Lane = number;
const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

type Heap = Array<Node>;
interface Task {
	id: number;
	callback: ((didUserCallbackTimeout: boolean) => any) | null;
	priorityLevel: Lane;
	startTime: number;
	expirationTime: number;
	sortIndex?: number;
	desc?: string;
}
type Node = Task;

class MinHeap {
	array: Heap;
	size: number;

	constructor() {
		// 这是为了能够更方便对位置，最小堆从1开始可以很方便计算出child或者parent!
		this.array = [
			{
				id: 0,
				callback: () => {},
				priorityLevel: NoLane,
				startTime: 0,
				expirationTime: 0,
				sortIndex: 0,
				desc: "我只是个占位的，没有什么作用",
			},
		];
		this.size = 0;
	}

	push(value: Node) {
		this.array.push(value);
		this.size++;
		this.shiftUp(this.size);
	}

	pop(): Node | null {
		if (this.size <= 0) {
			return null;
		}
		if (this.size === 1) {
			const deleteData = this.array[1];
			this.size = 0;
			this.array.length = this.size + 1;
			return deleteData;
		}
		const deleteData = this.array[1];
		this.array[1] = this.array[this.size];
		this.size--;
		this.array.length = this.size + 1;
		this.shiftDown(1);
		return deleteData;
	}

	peek(): Node | null {
		if (this.size > 0) {
			return this.array[1];
		}
		return null;
	}

	isEmpty() {
		return this.size === 0;
	}

	shiftUp(index: number) {
		while (this.getParentIndex(index) >= 1) {
			const parentIndex = this.getParentIndex(index);
			let currentValue = this.array[index];
			let parentValue = this.array[parentIndex];
			if (currentValue < parentValue) {
				this.swap(this.array, index, parentIndex);
				index = parentIndex;
			} else {
				break;
			}
		}
	}
	shiftDown(index: number) {
		let current = index;
		while (current <= this.size) {
			const leftIndex = this.getChildLeft(current);
			const rightIndex = this.getChildRight(current);
			let tempIndex = current;
			if (leftIndex <= this.size && this.array[leftIndex] < this.array[tempIndex]) {
				tempIndex = leftIndex;
			}
			if (rightIndex <= this.size && this.array[rightIndex] < this.array[tempIndex]) {
				tempIndex = rightIndex;
			}
			if (tempIndex === current) {
				break;
			}
			this.swap(this.array, current, tempIndex);
			current = tempIndex;
		}
	}

	swap(nums: Array<Task>, i: number, j: number) {
		const temp = nums[i];
		nums[i] = nums[j];
		nums[j] = temp;
	}

	getParentIndex(index: number) {
		// root=1
		// parent=2 => 4 5
		// parent=3 => 6 7
		return Math.floor(index / 2);
	}
	getChildLeft(index: number) {
		return index * 2;
	}
	getChildRight(index: number) {
		return index * 2 + 1;
	}
}

export { MinHeap };
export type { Task };
