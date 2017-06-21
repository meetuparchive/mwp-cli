const webpack = require('webpack');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');

module.exports = [
	// Tells loaders to optimize what they can since in minimize mode
	new webpack.LoaderOptionsPlugin({
		minimize: true,
		debug: false,
		quiet: true,
	}),

	new webpack.optimize.UglifyJsPlugin({
		compress: {
			warnings: false,
		},
		output: {
			comments: false,
		},
	}),
	new SWPrecacheWebpackPlugin({
		cacheId: 'mwp',
		dontCacheBustUrlsMatching: /\.\w{8}\./,
		filename: 'asset-service-worker.js',
		minify: true,
		staticFileGlobsIgnorePatterns: [/\.map$/, /.json$/],
	}),
];
