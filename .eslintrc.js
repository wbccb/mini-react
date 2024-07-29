module.exports = {
	root: true,
	env: {
		browser: true,
		es2021: true,
		node: true,
		"vue/setup-compiler-macros": true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier",
		"plugin:prettier/recommended",
	],
	parser: "vue-eslint-parser",
	parserOptions: {
		ecmaVersion: "latest",
		parser: "@typescript-eslint/parser",
		sourceType: "module",
	},
	plugins: ["vue", "@typescript-eslint", "prettier"],
	globals: {
		ElMessage: true,
		ElMessageBox: true,
	},
	rules: {
		"prettier/prettier": ["error", { "useTabs": true, "printWidth": 80 }],
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		semi: ["error", "always"],
		"vue/multi-word-component-names": 0,
		// "quote-props": ["error", "always"],
		"@typescript-eslint/no-inferrable-types": "off",
	},
};
