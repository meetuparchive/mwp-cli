const path = require('path');
const chalk = require('chalk');
const webpack = require('webpack');
const { promisify } = require('util');
const { paths } = require('mwp-config');

const webpackPromise = promisify(webpack);

const compile = (getBundlePath, localeCode, config) => {
	return webpackPromise(config).then(stats => {
		const relativeBundlePath = getBundlePath(stats, localeCode);

		console.log(
			chalk.blue(`built ${relativeBundlePath}`)
		);
	}).catch((error) => {
		console.error(
			chalk.red('server bundle webpack error:')
		);
		console.error(error);
	});
};

// utility function to allow us to execute builds sequentially
const promiseSerial = funcs =>
	funcs.reduce(
		(promise, func) =>
			promise.then(result =>
				func().then(Array.prototype.concat.bind(result))
			),
		Promise.resolve([])
	);

/*
 * A function to determine the build-directory-relative path to a bundle based
 * on webpack config values and build stats
 */
const getRelativeBundlePath = (entry, output) => (stats, localeCode = '') => {
	const entryChunk = stats.toJson().assetsByChunkName[entry];
	const filename = entryChunk instanceof Array ? entryChunk[0] : entryChunk; // filename determined by webpack output.filename
	const fullPath = path.resolve(output, localeCode, filename);
	return path.relative(paths.buildPath, fullPath);
};

module.exports = {
	compile,
	getRelativeBundlePath,
	promiseSerial,
};
