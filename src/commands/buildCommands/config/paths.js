const path = require('path');
const webpack = require('webpack');
const {repoRoot, appPath} = require('../../../util/paths');

const outPath = path.resolve(repoRoot, 'build');

module.exports = {
	repoRoot,
	appPath,
	assetPath: path.resolve(appPath, 'assets'), // pre-made static assets
	browserAppEntryPath: path.resolve(appPath, 'browser-app-entry.js'),
	browserAppOutputPath: path.resolve(outPath, 'browser-app'),
	cssPath: path.resolve(appPath, 'assets', 'css'),
	outPath,
	serverAppModulePath: path.resolve(outPath, 'server-app', 'serverAppMap.js'),
	serverAppEntryPath: path.resolve(appPath, 'server-app-entry.js'),
	serverAppOutputPath: path.resolve(outPath, 'server-app'),
	trnsPath: path.resolve(appPath, 'trns'),
	vendorBundlesPath: path.resolve(outPath, 'vendor'),
	webComponentsSrcPath: /node_modules\/meetup-web-components\/src/,
	webComponentsIconsPath: /node_modules\/meetup-web-components\/icons/,
};
