// Require modules
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const webpack = require('webpack');
const StatsPlugin = require('webpack-stats-plugin').StatsWriterPlugin;
const { env, paths } = require('mwp-config');

// Build settings
const prodPlugins = require('./prodPlugins');
const rules = require('./rules');

/*
 * Webpack config object determined by passed-in localeCode. The language is
 * used to resolve the translated message module paths and determine the output
 * path
 *
 * The server app is a module that exports a rendering function that can be
 * imported by the server and used to render requests to the app route.
 */
function getConfig(localeCode) {
	const publicPath = `${env.properties.publicPathBase}${localeCode}/`;

	const baseWebfontDir = path.resolve(paths.src.server.app, 'assets', 'fonts');
	const webfontDir =
		localeCode === 'ru-RU'
			? path.resolve(baseWebfontDir, localeCode)
			: baseWebfontDir;

	const config = {
		mode: env.properties.isProd ? 'production' : 'development',

		entry: {
			'server-app': [paths.src.server.entry]
		},

		// write a CommonJS module that can be imported into Node server scripts
		output: {
			libraryTarget: 'commonjs2',
			path: path.join(paths.output.server, localeCode),
			filename: "[name].js",
			publicPath
		},

		devtool: 'eval',

		module: {
			rules: [
				rules.file,
				rules.scssModule,
				rules.css,
				rules.js.server,
				rules.raw
			]
		},

		plugins: [
			/**
			 * @see https://webpack.js.org/plugins/environment-plugin/
			 */
			new webpack.EnvironmentPlugin({
				NODE_ENV: 'development', // required for prod build of React
			}),

			/**
			 * @see https://webpack.js.org/plugins/define-plugin/
			 */
			new webpack.DefinePlugin({
				// server bundles must reference _browser_ bundle public path
				// - inject it as a 'global variable' here
				VENDOR_MANIFEST_PATH: JSON.stringify(
					path.resolve(paths.output.browser, 'manifest.json')
				),
				BROWSER_MANIFEST_PATH: JSON.stringify(
					path.resolve(paths.output.browser, localeCode, 'manifest.json')
				),
			}),

			/**
			 * @see https://github.com/FormidableLabs/webpack-stats-plugin
			 */
			new StatsPlugin({ fields: null }) // null means 'all fields in stats file'
		],

		target: 'node',

		externals: [
			nodeExternals({
				modulesDir: process.env.NODE_PATH ? process.env.NODE_PATH : null,
				whitelist: [
					/^meetup-web-components/,
					/^swarm-icons\/dist\/sprite\/sprite\.inc$/
				],
			}),
			/.*?build\//
		],

		resolve: {
			alias: {
				src: paths.src.server.app,
				trns: path.resolve(paths.src.trns, 'modules', localeCode),
				webfont: webfontDir,
			},
			// module name extensions that Webpack will try to resolve imports
			// '*' matches any import with an extension
			extensions: ['.js', '.jsx', '.json', '*']
		}
	};

	if (env.properties.isProd) {
		config.plugins = config.plugins.concat(prodPlugins);
	}

	return config;
}

// export the config-building function for programmatic consumption
module.exports = getConfig;
