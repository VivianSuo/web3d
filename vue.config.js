const { defineConfig } = require("@vue/cli-service");

const TerserPlugin = require("terser-webpack-plugin");

module.exports = defineConfig({
  runtimeCompiler: true,
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === "production" ? "./" : "/",
  devServer: {
    client: {
      overlay: false,
    },
    // headers: {
    //   "Access-Control-Allow-Origin": "*",
    // },
    open: true,
    hot: true,
    // host: "localhost",
    host: "0.0.0.0",
    port: 8082,
    proxy: {
      "/api": {
        target: "http://172.16.20.33:8087",
        changeOrigin: true,
        // pathRewrite: {
        //   // 将访问路径的/api/替换成‘’，后台服务不用加api了,但前端的请求地址还是要加/api/
        //   "^/api/": "",
        // },
      },
    },
  },
  configureWebpack: {
    devtool:
      process.env.NODE_ENV === "production"
        ? false
        : "eval-cheap-module-source-map",
    // plugins: [new HardSourceWebpackPlugin()],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
          },
        }),
      ],
    },
  },
});
