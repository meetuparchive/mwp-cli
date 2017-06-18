const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const StatsPlugin = require('stats-webpack-plugin');

const settings = require('./settings');

const buildConfig = require('meetup-web-platform/lib/util/config/build')
	.default;

/**
 * When in dev, we need to manually inject some configuration to enable HMR
 *
 * @param {Object} config webpack config object
 * @returns {Object} HMR-ified config
 */
function injectHotReloadConfig(config) {
	config.entry.app.unshift(
		'react-hot-loader/patch', // logic for hot-reloading react components
		`webpack-dev-server/client?http://${buildConfig.asset_server
			.host}:${buildConfig.asset_server.port}/`, // connect to HMR websocket
		'webpack/hot/dev-server' // run the dev server
	);

	// plugins
	config.plugins.push(new webpack.HotModuleReplacementPlugin()); // enable module.hot
	config.plugins.push(new webpack.NamedModulesPlugin()); // show HMR module filenames

	// inject code hooks into react-hot-loader/patch
	const jsRule = config.module.rules.find(rule =>
		(rule.use || []).find(use => use.loader === 'babel-loader')
	);
	jsRule.use.unshift('react-hot-loader/webpack');

	return config;
}

/*
 * Webpack config object determined by passed-in localeCode. The language is
 * used to resolve the translated message module paths in applications that
 * support translations (currently not supported by starter kit), but also
 * to determine the output path
 */
function getConfig(localeCode) {
	const config = {
		entry: {
			app: [settings.browserAppEntryPath],
		},

		output: {
			path: path.resolve(settings.browserAppOutputPath, localeCode),
			filename: buildConfig.isDev
				? '[name].js' // in dev, keep the filename consistent to make reloading easier
				: '[name].[chunkhash].js', // in prod, add hash to enable long-term caching
			// publicPath is set at **runtime** using __webpack_public_path__
			// in the browser entry script
		},

		// source maps are slow to generate, so only create them in prod
		// also, the `eval` output provides sufficient source map hooks
		// this needs revision: https://meetup.atlassian.net/browse/MW-952
		devtool: buildConfig.isDev ? 'eval' : 'source-map',

		module: {
			rules: [
				{
					// build-time eslint validation
					test: /\.jsx?$/,
					loader: 'eslint-loader',
					include: [settings.appPath],
					exclude: settings.assetPath,
					enforce: 'pre',
					options: {
						cache: true,
					},
				},
				{
					// standard ES5 transpile through Babel
					test: /\.jsx?$/,
					include: [settings.appPath, settings.webComponentsSrcPath],
					use: [
						{
							loader: 'babel-loader',
							options: {
								cacheDirectory: true,
								presets: [['es2015', { modules: false }]],
							},
						},
					],
				},
				{
					// bundle CSS references into external files
					test: /\.css$/,
					include: [settings.cssPath],
					use: ['style-loader', 'css-loader'],
				},
			],
		},

		resolveLoader: {
			alias: {
				'require-loader': path.resolve(
					settings.utilsPath,
					'require-loader.js'
				),
			},
		},

		resolve: {
			alias: {
				src: settings.appPath,
				trns: path.resolve(settings.trnsPath, 'modules', localeCode),
			},
			// module name extensions that Webpack will try if no extension provided
			extensions: ['.js', '.jsx', '.json'],
		},
		plugins: [
			new webpack.EnvironmentPlugin({
				NODE_ENV: 'development', // required for prod build of React (specify default)
			}),
			new webpack.DllReferencePlugin({
				context: '.',
				manifest: require(path.resolve(
					settings.outPath,
					'browser-app',
					'react-dll-manifest.json'
				)),
			}),
			new webpack.DllReferencePlugin({
				context: '.',
				manifest: require(path.resolve(
					settings.outPath,
					'browser-app',
					'vendor-dll-manifest.json'
				)),
			}),
			new ManifestPlugin({ writeToFileEmit: true }), // emit manifest from dev-server build
			new StatsPlugin('stats.json', 'verbose'),
		],
	};

	if (buildConfig.isDev && !buildConfig.disable_hmr) {
		injectHotReloadConfig(config);
	}
	if (buildConfig.isProd) {
		config.plugins = config.plugins.concat(settings.prodPlugins);
	}
	return config;
}

// export the config-building function _only_ - this cannot be run by the CLI
module.exports = getConfig;
