import { useState } from "react";

var stateFn: any;

export const DiffDelete = () => {
	const [count, setCount] = useState(0);

	if (!stateFn) {
		stateFn = function handleClick() {
			setCount(count + 1);
		};
	}

	setTimeout(() => {
		var increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			increateAge[0].removeEventListener("click", stateFn);
			increateAge[0].addEventListener("click", stateFn);
		}
	}, 0);

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
		</>
	);
};
