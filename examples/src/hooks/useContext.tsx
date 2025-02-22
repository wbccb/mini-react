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

	return (
		<ThemeContext.Provider value={theme}>
			<button id="我是useState的button" onClick={stateFn}>
				改变theme
			</button>
			<ContextChild />
		</ThemeContext.Provider>
	);
}
