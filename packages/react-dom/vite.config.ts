import {defineConfig} from 'vite'
import {resolve} from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: {
        "main": resolve(__dirname, 'src/main.ts'),
        "client": resolve(__dirname, 'src/client/index.ts'),
      }
    }
  },
  resolve: {alias: {src: resolve('src/')}},
  plugins: [dts()],
})