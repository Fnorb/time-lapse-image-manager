const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: './', // Set public path to relative, so assets are loaded correctly in Electron
})
