const os = require('os');
const path = require('path');
const { env, paths } = require('mwp-config');
const postCssLoaderConfig = require('./postCssLoaderConfig.js');

const entrySrcPath = path.resolve(process.cwd(), 'src');
const legacySrcPath = path.resolve(process.cwd(), 'packages', 'mupweb-legacy', 'src');
const assetPath = path.resolve(legacySrcPath, 'assets');

/**
 * babelConfig is a file specified by the consumer app
 * that supplies options to babel-loader and webpack
 *
 * e.g. `mope build browser --babelConfig=./babel.config.js`
 *
 * @see https://webpack.js.org/configuration/module/#module-rules
 *
 * @param buildtype string one of [browser|server]
 */
// custom cache directory that can be saved between runs of CI build
const cacheDirectory = path.resolve(os.homedir(), '.cache/babel-loader/');
console.log('cache dir', cacheDirectory);

module.exports = (babelConfig, buildType) => {
	const browserJSRules = {
		// standard ES5 transpile through Babel
		test: /\.(ts|js)x?$/,
		include: [
			legacySrcPath,
			entrySrcPath, // only used for JSX in app entry modules (e.g. browser-app-entry)
			paths.packages.webComponents.src,
			paths.packages.mupwebPackages.lib,
		], // need localPackages here for source maps to work
		exclude: assetPath,
		use: [
			{
				loader: 'babel-loader',
				options: {
					cacheDirectory,
					plugins: env.properties.isDev
						? babelConfig.plugins.concat(['react-hot-loader/babel'])
						: babelConfig.plugins,
					presets: babelConfig.presets,
				},
			},
		],
	};

	const serverJSRules = {
		test: /\.jsx?$/,
		include: [legacySrcPath, entrySrcPath, paths.packages.webComponents.src],
		exclude: assetPath,
		use: [
			{
				loader: 'babel-loader',
				options: {
					cacheDirectory,
					plugins: babelConfig.plugins,
					presets: babelConfig.presets,
				},
			},
		],
	};

	const jsRules = buildType === 'browser' ? browserJSRules : serverJSRules;

	return {
		js: jsRules,
		scssModule: {
			test: /\.module\.scss$/,
			include: [
				legacySrcPath,
				paths.localPackages,
				/\/node_modules\/@meetup\//,
			],
			use: [
				'isomorphic-style-loader',
				{
					loader: 'css-loader',
					options: {
						importLoaders: 2,
						modules: true,
						localIdentName: '_[name]_[local]__[hash:base64:5]',
					},
				},
				postCssLoaderConfig,
				'sass-loader',
			],
		},
		baseScss: {
			test: /main\.scss$/,
			include: [legacySrcPath],
			use: [
				{
					loader: 'file-loader',
					options: {
						name: '[name].[hash:8].css',
					},
				},
				'extract-loader',
				'css-loader',
				postCssLoaderConfig,
				'sass-loader',
			],
		},
		css: {
			// local CSS files that may refer to other local static assets such as images
			// that will be bundled with the application
			test: /\.css$/,
			include: [legacySrcPath, paths.localPackages],
			use: ['style-loader', 'css-loader'],
		},
		externalCss: {
			// third-party CSS that does not refer to local static assets - load as normal
			// file without any translation of import paths
			test: /\.css$/,
			include: [path.resolve(paths.repoRoot, 'node_modules')],
			use: [
				{
					loader: 'file-loader',
					options: {
						name: '[name].[hash:8].css',
					},
				},
			],
		},
		file: {
			test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|mp4|m4a|aac|oga)$/,
			use: [
				{
					loader: 'file-loader',
					options: {
						name: '[name].[hash:8].[ext]',
					},
				},
			],
		},
		raw: {
			test: /\.inc?$/,
			use: ['raw-loader'],
		},
	};
};
