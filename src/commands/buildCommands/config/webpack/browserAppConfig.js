const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');

const paths = require('../paths');
const env = require('../env');
const prodPlugins = require('./prodPlugins');
const babelrc = require('./_babelrc');

/**
 * When in dev, we need to manually inject some configuration to enable HMR
 *
 * @param {Object} config webpack config object
 * @returns {Object} HMR-ified config
 */
function injectHotReloadConfig(config) {
	config.entry.app.unshift(
		'react-hot-loader/patch', // logic for hot-reloading react components
		`webpack-dev-server/client?http://${env.properties.asset_server.host}:${env
			.properties.asset_server.port}/`, // connect to HMR websocket
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
			app: [paths.browserAppEntryPath],
		},

		output: {
			path: path.resolve(paths.browserAppOutputPath, localeCode),
			filename: env.properties.isDev
				? '[name].js' // in dev, keep the filename consistent to make reloading easier
				: '[name].[chunkhash].js', // in prod, add hash to enable long-term caching
			hashDigestLength: 8,
			publicPath: `/static/${localeCode}/`,
		},

		// source maps are slow to generate, so only create them in prod
		// also, the `eval` output provides sufficient source map hooks
		// this needs revision: https://meetup.atlassian.net/browse/MW-952
		devtool: env.properties.isDev ? 'eval' : 'source-map',

		module: {
			rules: [
				{
					// standard ES5 transpile through Babel
					test: /\.jsx?$/,
					include: [paths.appPath, paths.webComponentsSrcPath],
					exclude: paths.assetPath,
					use: [
						{
							loader: 'babel-loader',
							options: {
								cacheDirectory: true,
								plugins: babelrc.plugins.browser,
								presets: babelrc.presets.browser,
							},
						},
						{ loader: 'eslint-loader' },
					],
				},
				{
					// bundle CSS references into external files
					test: /\.css$/,
					include: [paths.cssPath],
					use: ['style-loader', 'css-loader'],
				},
			],
		},

		resolveLoader: {
			alias: {
				'require-loader': path.resolve(__dirname, 'require-loader.js'),
			},
		},

		resolve: {
			alias: {
				src: paths.appPath,
				trns: path.resolve(paths.trnsPath, 'modules', localeCode),
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
					paths.vendorBundlesPath,
					'react-dll-manifest.json'
				)),
			}),
			new webpack.DllReferencePlugin({
				context: '.',
				manifest: require(path.resolve(
					paths.vendorBundlesPath,
					'vendor-dll-manifest.json'
				)),
			}),
			new ManifestPlugin({ writeToFileEmit: true }), // emit manifest from dev-server build
			new StatsPlugin('stats.json', 'verbose'),
		],
	};

	if (env.properties.isDev && !env.properties.disable_hmr) {
		injectHotReloadConfig(config);
	}
	if (env.properties.isProd) {
		config.plugins = config.plugins.concat(
			prodPlugins,
			new SWPrecacheWebpackPlugin({
				cacheId: 'mwp',
				dontCacheBustUrlsMatching: /\.\w{8}\./, // no need for cache-busting querystring on hashed filenames
				filename: `asset-service-worker.js`,
				minify: true,
				staticFileGlobsIgnorePatterns: [
					// don't cache these files
					/\.map$/, // source-maps
					/.json$/, // manifest files
				],
			})
		);
	}
	return config;
}

// export the config-building function _only_ - this cannot be run by the CLI
module.exports = getConfig;
