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
	const [count, setCount] = useState(0);

	function handleClick() {
		setCount(count + 1);
	}

	return (
		<>
			<button
				onClick={() => {
					dispatch({ type: "incremented_age" });
				}}
			>
				Increment age
			</button>
			<p>Hello! You are {state.age}.</p>

			<button onClick={handleClick}>You pressed me {count} times</button>
		</>
	);
}
