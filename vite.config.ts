import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    clearScreen: false,
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            formats: ['cjs'],
            name: 'extension',
            fileName: 'extension',
            
        },
        rolldownOptions: {
            external: ["vscode", 'commonjs'],
            output:{
                entryFileNames: "extension.js"
            },
        }
    },
})

