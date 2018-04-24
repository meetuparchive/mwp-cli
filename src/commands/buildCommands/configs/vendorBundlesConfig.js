const ManifestPlugin = require('webpack-manifest-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require('webpack');
const path = require('path');

const paths = require('../paths');
const env = require('../env');
const prodPlugins = require('./prodPlugins');

const dllName = "[name]_lib";

const config = {
	mode: env.properties.isProd ? "production" : "development",
	entry: {
		react: [
			"react",
			"react-dom",
			"react-facebook-login",
			"react-helmet",
			"react-intl",
			"react-redux",
			"react-router",
			"react-router-dom",
			"react-waypoint"
		],
		vendor: [
			"autosize",
			"consolidated-events",
			"fbjs",
			"flatpickr",
			"history",
			"intl-messageformat",
			"intl-relativeformat",
			"prop-types",
			"qs",
			"redux",
			"rison"
		],
	},
	output: {
		path: paths.output.browser,
		filename: "[name].[chunkhash].js",
		hashDigestLength: 8,
		library: dllName,
	},

	plugins: [
		new webpack.EnvironmentPlugin({
			NODE_ENV: "development", // required for prod build of React
		}),
		new webpack.DllPlugin({
			// The path to the manifest file which maps between
			// modules included in a bundle and the internal IDs
			// within that bundle
			path: path.resolve(paths.output.vendor, "[name]-dll-manifest.json"),
			// The name of the global variable which the library's
			// require function has been assigned to. This must match the
			// output.library option above
			name: dllName,
		}),
		new ManifestPlugin({
			publicPath: `${env.properties.asset_server.path}/`,
		})
	],
	optimization: {
		minimizer: [
			new UglifyJsPlugin({
				uglifyOptions: {
					compress: {
						warnings: false,
					},
					output: {
						comments: false,
					},
				},
				sourceMap: true,
			})
		],
	},
};


if (env.properties.isProd) {
	config.plugins = config.plugins.concat(prodPlugins);
}


module.exports = config;
