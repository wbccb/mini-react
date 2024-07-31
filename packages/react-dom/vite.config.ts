import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

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
	plugins: [
		dts({
			include: ["./src/**/*"],
			copyDtsFiles: true,
		}),
	],
});
