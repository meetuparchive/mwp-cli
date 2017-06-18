const path = require('path');
const webpack = require('webpack');

const repoRoot = process.cwd();
const appPath = path.resolve(repoRoot, 'src');
const outPath = path.resolve(repoRoot, 'build');

module.exports = {
	repoRoot,
	appPath,
	assetPath: path.resolve(appPath, 'assets'),
	browserAppEntryPath: path.resolve(appPath, 'browser-app-entry.js'),
	browserAppOutputPath: path.resolve(outPath, 'browser-app'),
	cssPath: path.resolve(appPath, 'assets', 'css'),
	localeCodes: require(path.resolve(appPath, 'util', 'locales')),
	outPath,
	prodPlugins: [
		// Tells loaders to optimize what they can since in minimize mode
		new webpack.LoaderOptionsPlugin({
			minimize: true,
			debug: false,
			quiet: true,
		}),

		new webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: false,
			},
			output: {
				comments: false,
			},
		}),
	],
	serverAppModulePath: path.resolve(outPath, 'server-app', 'serverAppMap.js'),
	serverAppEntryPath: path.resolve(appPath, 'server-app-entry.js'),
	serverAppOutputPath: path.resolve(outPath, 'server-app'),
	trnsPath: path.resolve(appPath, 'trns'),
	utilsPath: path.resolve(repoRoot, 'util'),
	webComponentsSrcPath: /node_modules\/meetup-web-components\/src/,
	webComponentsIconsPath: /node_modules\/meetup-web-components\/icons/,
};
