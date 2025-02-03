const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: './',
  outputDir: 'dist-vue',
  css: {
    loaderOptions: {
      stylus: {
        stylusOptions: {
          import: [
            "~@/assets/styles/theme.styl",
            "~@/assets/styles/fonts.styl",
            "~@/assets/styles/global.styl",
          ] 
        }
      }
    }
  },
})
