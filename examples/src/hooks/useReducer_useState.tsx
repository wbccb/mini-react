import { useReducer, useState } from "react";

function reducer(state: any, action: any) {
	if (action.type === "incremented_age") {
		return {
			age: state.age + 1,
		};
	}
	throw Error("Unknown action.");
}
var increateAge;
var fn: any;
export default function TestuseReducerAnduseState() {
	const [state, dispatch] = useReducer(reducer, { age: 42 });
	// const [count, setCount] = useState(0);
	//
	// function handleClick() {
	// 	setCount(count + 1);
	// }

	setTimeout(() => {
		increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			if (!fn) {
				fn = function clickListener() {
					dispatch({ type: "incremented_age" });
				};
			}
			increateAge[0].removeEventListener("click", fn);
			increateAge[0].addEventListener("click", fn);
		}
	}, 0);

	return (
		<>
			<button id="我是ClassComponent的button">增加</button>
			<p>{state.age}</p>

			{/*<button onClick={handleClick}>You pressed me {count} times</button>*/}
		</>
	);
}
