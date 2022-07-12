const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'main.js'),
      name: 'replicad-hinges',
      fileName: (format) => `replicad-hinges.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['replicad'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          replicad: 'replicad'
        }
      }
    }
  }
})
