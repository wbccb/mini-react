import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";

var stateFn: any;
var increateAge: any;
export const TestUseMemo = () => {
	const stateFn = useCallback(() => {
		console.error("setCount(count + 1)触发");
		setCount(count + 1);
	}, []);

	// @ts-ignore
	if (window.stateFn === stateFn) {
		console.error("重新渲染时useCallback: window.stateFn === stateFn");
	} else {
		console.error("重新渲染时useCallback: window.stateFn !!!!!!!!!== stateFn");
	}
	// @ts-ignore
	window.stateFn = stateFn;

	// ================== 测试数据 ==================
	var [count, setCount] = useState(0);
	if (stateFn) {
		increateAge = document.getElementsByTagName("button");
		if (increateAge && increateAge[0]) {
			increateAge[0].removeEventListener("click", stateFn);
		}
	}
	setTimeout(() => {
		increateAge = document.getElementsByTagName("button");
		console.error("useEffect_LayoutEffect.tsx", increateAge);
		if (increateAge && increateAge[0]) {
			console.error("useEffect_LayoutEffect.tsx increateAge[0]", increateAge[0]);
			increateAge[0].addEventListener("click", stateFn);
		}
	}, 0);
	// ================== 测试数据 ==================

	const countData = useMemo(() => {
		console.error("useMemo依赖为count", count);
		return count;
	}, [count]);
	const countMemoData = useMemo(() => {
		console.error("useMemo依赖为[]", count);
		return count;
	}, []);

	const ref = useRef({
		test: "我是useRef",
	});
	// @ts-ignore
	if (window.ref === ref.current) {
		console.error("重新渲染时useRef: window.ref === ref.current");
	} else {
		console.error("重新渲染时useRef: window.ref !== ref.current");
	}
	// @ts-ignore
	window.ref = ref.current;

	return (
		<>
			<button id="我是useState的button">增加useState</button>
			<p>这是依赖count变化的memo: {countData}</p>
			<p>这是没有依赖的memo: {countMemoData}</p>
		</>
	);
};
