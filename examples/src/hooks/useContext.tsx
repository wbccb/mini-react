import { createContext, useCallback, useContext, useState } from "react";

const ThemeContext = createContext(null);

function ConsumerComponentDemo() {
	return (
		<ThemeContext.Consumer>
			{(theme) => (
				<div style={{ padding: "20px" }}>
					<h2>Context.Consumer Component</h2>
					<p>Current Theme: {theme}</p>
				</div>
			)}
		</ThemeContext.Consumer>
	);
}

function ContextChild() {
	const theme = useContext(ThemeContext);

	return (
		<div>
			当前的theme是: {theme}
			<ConsumerComponentDemo />
		</div>
	);
}
var increateAge: any;
export default function TestUseContext() {
	const [theme, setTheme] = useState("light");

	const stateFn = useCallback(() => {
		console.error("setCount(count + 1)触发");
		setTheme((prevTheme: string) => (prevTheme === "light" ? "dark" : "light"));
	}, []);

	setTimeout(() => {
		increateAge = document.getElementsByTagName("button");
		console.error("useEffect_LayoutEffect.tsx", increateAge);
		if (increateAge && increateAge[0]) {
			console.error("useEffect_LayoutEffect.tsx increateAge[0]", increateAge[0]);
			increateAge[0].addEventListener("click", stateFn);
		}
	}, 0);

	return (
		<ThemeContext.Provider value={theme}>
			<button id="我是useState的button">改变theme</button>
			<ContextChild />
		</ThemeContext.Provider>
	);
}
