const path = require('path');
const { babel, env, paths } = require('mwp-config');
const customProperties = require('swarm-constants/dist/js/customProperties.js').customProperties;

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
					localIdentName: "_[name]_[local]__[hash:base64:5]",
					minimize: true
				}
			},
			{
				loader: 'postcss-loader',
				options: {
					ident: 'postcss',
					plugins: loader => [
						require('postcss-cssnext')({
							browsers: ['last 2 versions', 'not ie <= 10'],
							features: {
								customProperties: false,
								colorFunction: false,
							},
						}),
						require('postcss-css-variables')({
							preserve: true,
							variables: customProperties,
						})
					]
				}
			},
			'sass-loader'
		]
	},
	css: {
		test: /\.css$/,
		include: [path.resolve(paths.src.asset, 'css')],
		use: ["style-loader", "css-loader"]
	},
	js: {
		browser: {
			// standard ES5 transpile through Babel
			test: /\.jsx?$/,
			include: [paths.src.browser.app, paths.packages.webComponents.src],
			exclude: paths.src.asset,
			use: [
				{
					loader: "babel-loader",
					options: {
						cacheDirectory: true,
						plugins: env.properties.isDev ? babel.plugins.browser.concat(['react-hot-loader/babel']) : babel.plugins.browser,
						presets: babel.presets.browser
					}
				}
			]
		},
		server: {
			test: /\.jsx?$/,
			include: [paths.src.server.app, paths.packages.webComponents.src],
			exclude: paths.src.asset,
			use: [
				{
					loader: "babel-loader",
					options: {
						cacheDirectory: true,
						plugins: babel.plugins.server,
						presets: babel.presets.server
					}
				}
			]
		}
	},
	file: {
		test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|mp4|m4a|aac|oga)$/,
		use: ["file-loader"]
	},
	raw: {
		test: /\.inc?$/,
		use: ["raw-loader"]
	}
};
