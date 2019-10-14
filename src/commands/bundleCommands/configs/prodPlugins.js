const webpack = require('webpack');

module.exports = [
	// Tells loaders to optimize what they can since in minimize mode
	new webpack.LoaderOptionsPlugin({
		minimize: true,
		debug: false,
		quiet: true,
	}),
];
