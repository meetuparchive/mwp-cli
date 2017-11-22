const webpack = require('webpack');
const ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin');

module.exports = [
	// Tells loaders to optimize what they can since in minimize mode
	new webpack.LoaderOptionsPlugin({
		minimize: true,
		debug: false,
		quiet: true,
	}),

	new ParallelUglifyPlugin({
		uglifyJS: {
			compress: {
				warnings: false,
			},
			output: {
				comments: false,
			},
		},
		sourceMap: false,
	}),
];
