import {defineConfig} from 'vite'
import {resolve} from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: {
        "client": resolve(__dirname, '/client.ts'),
      },
      formats: ["umd"]
    }
  },
  resolve: {alias: {src: resolve('src/')}},
  plugins: [dts({
    include: ['./src/**/*'],
    copyDtsFiles: true,
  })],
})