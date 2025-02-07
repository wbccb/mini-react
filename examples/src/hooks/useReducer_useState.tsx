import { useReducer, useState } from "react";

function reducer(state: any, action: any) {
	if (action.type === "incremented_age") {
		return {
			age: state.age + 1,
		};
	}
	throw Error("Unknown action.");
}

export default function TestuseReducerAnduseState() {
	const [state, dispatch] = useReducer(reducer, { age: 42 });
	// const [count, setCount] = useState(0);
	//
	// function handleClick() {
	// 	setCount(count + 1);
	// }

	setTimeout(() => {
		const increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			function clickListener() {
				dispatch({ type: "incremented_age" });
			}
			increateAge[0].removeEventListener("click", clickListener);
			increateAge[0].addEventListener("click", clickListener);
		}
	}, 1000);

	return (
		<>
			<button id={"increateAge"}>Increment age</button>
			<p>Hello! You are {state.age}.</p>

			{/*<button onClick={handleClick}>You pressed me {count} times</button>*/}
		</>
	);
}
