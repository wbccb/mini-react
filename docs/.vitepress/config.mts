import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "React18源码分析",
	description: "源码分析",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Examples", link: "/markdown-examples" },
		],

		sidebar: [
			{
				text: "Examples",
				items: [
					{ text: "Markdown Examples", link: "/markdown-examples" },
					{ text: "Runtime API Examples", link: "/api-examples" },
				],
			},
		],

		socialLinks: [{ icon: "github", link: "https://github.com/wbccb" }],
	},
});
