// Require modules
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');
const StatsPlugin = require('stats-webpack-plugin');

// Build settings
const paths = require('../paths');
const env = require('../env');
const prodPlugins = require('./prodPlugins');

/*
 * Webpack config object determined by passed-in localeCode. The language is
 * used to resolve the translated message module paths in applications that
 * support translations (currently not supported by starter kit), but also
 * to determine the output path, and to inject a WEBPACK_BASE_URL constant
 * referenced in built files
 *
 * The server app is a module that exports a rendering function that can be
 * imported by the server and used to render requests to the app route.
 */
function getConfig(localeCode) {
	const publicPath = `/${localeCode}/`;
	const config = {
		entry: {
			'server-app': [paths.serverAppEntryPath],
		},

		// write a CommonJS module that can be imported into Node server scripts
		output: {
			libraryTarget: 'commonjs2',
			path: path.join(paths.serverAppOutputPath, localeCode),
			filename: '[name].js',
			publicPath,
		},

		devtool: 'eval',

		module: {
			rules: [
				{
					test: /\.css$/,
					include: [paths.cssPath],
					use: ['style-loader', 'css-loader'],
				},
			],
		},

		plugins: [
			new webpack.EnvironmentPlugin({
				NODE_ENV: 'development', // required for prod build of React
			}),
			new webpack.DefinePlugin({
				// server bundles must reference _browser_ bundle public path
				// - inject it as a 'global variable' here
				WEBPACK_BASE_URL: JSON.stringify(
					localeCode === 'en-US' ? '' : `/${localeCode}`
				),
				WEBPACK_ASSET_PUBLIC_PATH: JSON.stringify(publicPath),
				VENDOR_MANIFEST_PATH: JSON.stringify(
					path.resolve(paths.browserAppOutputPath, 'manifest.json')
				),
				BROWSER_MANIFEST_PATH: JSON.stringify(
					path.resolve(
						paths.browserAppOutputPath,
						localeCode,
						'manifest.json'
					)
				),
			}),
			new StatsPlugin('stats.json', 'verbose'),
		],

		target: 'node',

		externals: [
			nodeExternals({
				modulesDir: process.env.NODE_PATH
					? process.env.NODE_PATH
					: null,
				whitelist: [/^meetup-web-components/],
			}),
			/.*?build\//,
		],

		resolveLoader: {
			alias: {
				'require-loader': path.resolve(__dirname, 'require-loader.js'),
			},
		},

		resolve: {
			alias: {
				src: paths.transpiled.server,
				trns: path.resolve(paths.trnsPath, 'modules', localeCode),
			},
			// module name extensions that Webpack will try if no extension provided
			extensions: ['.js', '.jsx', '.json'],
		},
	};
	if (env.properties.isProd) {
		config.plugins = config.plugins.concat(prodPlugins);
	}

	return config;
}

// export the config-building function for programmatic consumption
module.exports = getConfig;
