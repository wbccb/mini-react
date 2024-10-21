import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "/client.ts"),
			name: "client",
			fileName: "client",
			formats: ["es"],
		},
	},
	resolve: { alias: { src: resolve("src/") } },
	plugins: [],
});
