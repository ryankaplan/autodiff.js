// This webpack config is mostly copied from here:
//
// https://github.com/elboman/typescript-lib-example/blob/master/webpack.config.js
//

var path = require("path");
var webpack = require("webpack");

var PATHS = {
  entryPoint: path.resolve(__dirname, 'src/autodiff.ts'),
  testEntryPoint: path.resolve(__dirname, 'src/test-entry-point.ts'),
  bundles: path.resolve(__dirname, '_bundles'),
}

var config = {
  entry: {
    'autodiff': [PATHS.entryPoint],
    'autodiff.min': [PATHS.entryPoint],
    'test': [PATHS.testEntryPoint]
  },
  output: {
    path: PATHS.bundles,
    filename: '[name].js',
    libraryTarget: 'umd',
    // when used in the browser, this library will be accessible on the window
    // at `window.autodiff`
    library: 'autodiff',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  //devtool: 'source-map',
  // plugins: [
  //   new webpack.optimize.UglifyJsPlugin({
  //     minimize: true,
  //     // source maps are disabled by default in this plugin
  //     sourceMap: true,
  //     // Apply minification only to bundles that end in .min.js
  //     include: /\.min\.js$/,
  //   })
  // ],
  module: {
    loaders: [{
      test: /\.ts$/,
      loader: 'awesome-typescript-loader',
      exclude: /node_modules/,
      query: {
        // We don't want any declaration file for the UMD bundle since it
        // wouldn't be useful. See the blog post linked at the top of this
        // file for more info.
        declaration: false,
      }
    }]
  }
}

module.exports = config;
