const path = require('path');
const { babel, env, paths } = require('mwp-config');
const postCssLoaderConfig = require('./postCssLoaderConfig.js');

/**
 * @see https://webpack.js.org/configuration/module/#module-rules
 */
module.exports = {
	scssModule: {
		test: /\.module\.scss$/,
		include: [paths.srcPath],
		use: [
			'isomorphic-style-loader',
			{
				loader: 'css-loader',
				options: {
					importLoaders: 2,
					modules: true,
					localIdentName: '_[name]_[local]__[hash:base64:5]'
				},
			},
			postCssLoaderConfig,
			'sass-loader',
		],
	},
	baseScss: {
		test: /main\.scss$/,
		include: [paths.srcPath],
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
		test: /\.css$/,
		include: [path.resolve(paths.src.asset, 'css')],
		use: ['style-loader', 'css-loader'],
	},
	js: {
		browser: {
			// standard ES5 transpile through Babel
			test: /\.jsx?$/,
			include: [paths.src.browser.app, paths.packages.webComponents.src],
			exclude: paths.src.asset,
			use: [
				{
					loader: 'babel-loader',
					options: {
						cacheDirectory: true,
						plugins: env.properties.isDev
							? babel.plugins.browser.concat([
									'react-hot-loader/babel',
							  ])
							: babel.plugins.browser,
						presets: babel.presets.browser,
					},
				},
			],
		},
		server: {
			test: /\.jsx?$/,
			include: [paths.src.server.app, paths.packages.webComponents.src],
			exclude: paths.src.asset,
			use: [
				{
					loader: 'babel-loader',
					options: {
						cacheDirectory: true,
						plugins: babel.plugins.server,
						presets: babel.presets.server,
					},
				},
			],
		},
	},
	file: {
		test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|mp4|m4a|aac|oga)$/,
		use: ['file-loader'],
	},
	raw: {
		test: /\.inc?$/,
		use: ['raw-loader'],
	},
};
