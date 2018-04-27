const { promisify } = require('util');
const chalk = require('chalk');
const webpack = require('webpack');

const webpackPromise = promisify(webpack);

const compile = (getBundlePath, localeCode, config) => {
	return webpackPromise(config).then(stats => {
		const relativeBundlePath = getBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
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

module.exports = {
	compile,
	promiseSerial,
};
