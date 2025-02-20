import { useState, useEffect, useLayoutEffect } from "react";

var stateFn: any;
var increateAge: any;
export const TestUseEffectAndUseLayoutEffect = () => {
	var [count, setCount] = useState(0);
	console.warn("useEffect", "count", count);

	if (stateFn) {
		increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			increateAge[0].removeEventListener("click", stateFn);
		}
	}

	stateFn = function () {
		console.warn("stateFn触发setCount()", "setCount:" + (count + 1));
		setCount(count + 1);
	};

	setTimeout(() => {
		increateAge = document.getElementsByTagName("button");
		console.warn("useEffect_LayoutEffect.tsx", increateAge);
		if (increateAge && increateAge[0]) {
			console.warn("useEffect_LayoutEffect.tsx increateAge[0]", increateAge[0]);
			increateAge[0].addEventListener("click", stateFn);
		}
	}, 0);

	useEffect(() => {
		console.log("createFn", "mount");
	}, []);

	useEffect(() => {
		console.log("createFn", "useEffect依赖count");
		return () => {
			console.log("createFn destory", "useEffect依赖count：destroy");
		};
	}, [count]);

	useLayoutEffect(() => {
		console.error("useLayoutEffect", "mount");
		return () => {
			console.error("useLayoutEffect destory");
		};
	}, []);

	useLayoutEffect(() => {
		console.error("useLayoutEffect", " mount useLayoutEffect依赖count");
		return () => {
			console.error("useLayoutEffect destory useLayoutEffect依赖count");
		};
	}, [count]);

	return (
		<>
			<button id="我是useState的button">增加useState</button>
			<p>{count}</p>
		</>
	);
};
