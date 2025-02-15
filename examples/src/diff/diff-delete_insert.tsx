import { useState } from "react";

var stateFn: any;
var increateAge: any;
export const DiffDelete_insert = () => {
	var array = useState(0);
	var count = array[0];
	var setCount = array[1];
	console.warn("diff-delete", "count", count);

	if (stateFn) {
		increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			increateAge[0].removeEventListener("click", stateFn);
		}
	}

	stateFn = function () {
		console.warn("diff-delete", "setCount");
		setCount(count + 1);
	};

	setTimeout(() => {
		increateAge = document.getElementsByTagName("button");
		console.warn("diff-delete_insert.tsx", increateAge);
		if (increateAge && increateAge[0]) {
			console.warn("diff-delete_insert.tsx increateAge[0]", increateAge[0]);
			increateAge[0].addEventListener("click", stateFn);
		}
	}, 0);

	// 点击一次按钮是删除，点击两次是新增
	const array1 = [1, 2, 3, 4];
	const array2 = [1, 2, 3];

	return (
		<>
			<button id="我是useState的button">增加useState</button>
			<div>
				{count % 2 === 0
					? array1.map((item) => <span key={item}>{item}</span>)
					: array2.map((item) => <span key={item}>{item}</span>)}
			</div>

			<p>{count}</p>
		</>
	);
};
