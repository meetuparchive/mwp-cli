const path = require('path');
const webpack = require('webpack');

const env = require('./env');

const repoRoot = process.cwd(); // expect CLI to be run from consumer repo root
const appPath = path.resolve(repoRoot, 'src');
const transpiled = path.resolve(repoRoot, 'transpiled');
const browserSrc = env.properties.isDev
	? appPath
	: path.resolve(transpiled, 'browser-app');
const serverSrc = env.properties.isDev
	? appPath
	: path.resolve(transpiled, 'server-app');
const outPath = path.resolve(repoRoot, 'build');

module.exports = {
	repoRoot,
	appPath,
	assetPath: path.resolve(appPath, 'assets'), // pre-made static assets
	browserSrc,
	browserAppEntryPath: path.resolve(browserSrc, 'browser-app-entry.js'),
	browserAppOutputPath: path.resolve(outPath, 'browser-app'),
	cssPath: path.resolve(appPath, 'assets', 'css'),
	outPath,
	serverSrc,
	serverAppModulePath: path.resolve(outPath, 'server-app', 'serverAppMap.js'),
	serverAppEntryPath: path.resolve(serverSrc, 'server-app-entry.js'),
	serverAppOutputPath: path.resolve(outPath, 'server-app'),
	transpiled: {
		browser: browserSrc,
		server: serverSrc,
	},
	trnsPath: path.resolve(appPath, 'trns'),
	vendorBundlesPath: path.resolve(outPath, 'vendor'),
	webComponentsSrcPath: /node_modules\/meetup-web-components\/src/,
	webComponentsIconsPath: /node_modules\/meetup-web-components\/icons/,
};
