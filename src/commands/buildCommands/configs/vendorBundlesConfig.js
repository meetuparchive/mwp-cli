const ManifestPlugin = require('webpack-manifest-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const { env, paths } = require('mwp-config');
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
		/**
		 * @see https://webpack.js.org/plugins/environment-plugin/
		 *
		 * Replaces references to process.env.NODE_ENV in the code
		 * with the build-time string value of NODE_ENV.
		 */
		new webpack.EnvironmentPlugin({
			// React relies on process.env.NODE_ENV for including dev warnings,
			// and we use it for similar purposes in application code.
			NODE_ENV: "development", // required for prod build of React
		}),

		/**
		 * @see https://webpack.js.org/plugins/dll-plugin/
		 */
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

		/**
		 * @see https://github.com/danethurber/webpack-manifest-plugin
		 */
		new ManifestPlugin({
			publicPath: `${env.properties.asset_server.path}/`,
		})
	],

	optimization: {
		minimizer: [
			/**
			 * @see https://webpack.js.org/plugins/uglifyjs-webpack-plugin/
			 */
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
