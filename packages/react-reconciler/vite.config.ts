import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "/index.ts"),
			name: "index",
			// the proper extensions will be added
			fileName: "index",
			formats: ["es"],
		},
	},
	resolve: { alias: { src: resolve("src/") } },
	plugins: [],
});
