const path = require("path");
const webpack = require("webpack");
// const TerserPlugin = require("terser-webpack-plugin");

/** @type { import('webpack').Configuration } */
module.exports = {
  entry: "./src/index.user.ts",
  devtool: "inline-source-map",
  mode: "development",
  // mode: "production", //Prod breaks comments
  watch: true,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  // optimization: {
  //   minimizer: [
  //     new TerserPlugin({
  //       extractComments: false,
  //     }),
  //   ],
  // },
  experiments: {
    topLevelAwait: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  output: {
    filename: "icare-tools.user.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: `
// ==UserScript==
// @name        iCare Tools
// @namespace   Violentmonkey Scripts
// @noframes
// @match       https://icare-vali.lausanne.ch/icare/*
// @match       https://icare.lausanne.ch/icare/*
// @grant       none
// @version     1.1
// @author      Nicolas Maitre
// @description Task scheduler for icare and helpers
// ==/UserScript==
`,
      raw: true,
    }),
  ],
};
