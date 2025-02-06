import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				index: resolve(__dirname, "/index.ts"),
				"jsx-runtime": resolve(__dirname, "/jsx-runtime.ts"),
				"jsx-dev-runtime": resolve(__dirname, "/jsx-dev-runtime.ts"),
			},
		},
	},
	resolve: { alias: { src: resolve("src/") } },
	plugins: [],
});
