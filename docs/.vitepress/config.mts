import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
	base: "/mini-react/",
	title: "React18源码分析",
	description: "",
	appearance: "dark",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [{ text: "Home", link: "https://github.com/wbccb/mini-react" }],

		outline: {
			label: "页面导航",
		},

		sidebar: [
			{
				text: "基础知识",
				items: [
					{ text: "React18使用详解", link: "/0-基础知识/React18使用详解" },
					{ text: "React如何使用css", link: "/0-基础知识/React如何使用css" },
					{ text: "React路由", link: "/0-基础知识/React路由" },
					{ text: "Redux状态管理多种模式", link: "/0-基础知识/Redux状态管理多种模式" },
					{ text: "SSR&CSR", link: "/0-基础知识/SSR&CSR" },
				],
			},
			{
				text: "前置知识&原理初探",
				items: [
					{
						text: "React初探-构建最小化的React",
						link: "/1-前置知识&原理初探/0-(WIP)React初探-构建最小化的React",
					},
					{ text: "React项目结构", link: "/1-前置知识&原理初探/1-React项目结构" },
				],
			},
			{
				text: "手写代码思路",
				items: [
					{
						text: "render&commit阶段",
						link: "/2-手写代码/render&commit阶段",
					},
					{
						text: "Scheduler实现思路",
						link: "/2-手写代码/Scheduler实现思路",
					},
				],
			},
			{
				text: "源码解析",
				items: [
					{
						text: "(WIP)首次渲染流程分析(一)",
						link: "/3-源码解析/1.(WIP)首次渲染流程分析(一)",
					},
					{
						text: "(WIP)首次渲染流程分析(二)",
						link: "/3-源码解析/2.(WIP)首次渲染流程分析(二)",
					},
					{
						text: "(WIP)非并发更新渲染流程分析(一)",
						link: "/3-源码解析/3.(WIP)非并发更新渲染流程分析(一)",
					},
					{
						text: "(WIP)非并发更新渲染流程分析(二)",
						link: "/3-源码解析/4.(WIP)非并发更新渲染流程分析(二)",
					},
					{
						text: "(WIP)常见hook源码分析",
						link: "/3-源码解析/5.(WIP)常见hook源码分析",
					},
					{
						text: "(WIP)合成事件",
						link: "/3-源码解析/6.(WIP)合成事件",
					},
				],
			},
		],

		socialLinks: [{ icon: "github", link: "https://github.com/wbccb" }],
	},
});
