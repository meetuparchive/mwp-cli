const { promisify } = require('util');
const chalk = require('chalk');
const webpack = require('webpack');
const addLocalesOption = require('../../util/addLocalesOption');

// utility function to allow us to execute builds sequentially
const promiseSerial = funcs =>
	funcs.reduce(
		(promise, func) =>
			promise.then(result =>
				func().then(Array.prototype.concat.bind(result))
			),
		Promise.resolve([])
	);

const compile = promisify(webpack);

const {
	package: packageConfig,
	paths,
	webpack: { getBrowserAppConfig, getRelativeBundlePath },
} = require('mwp-config');

// set up function for getting the built bundle filename
const getBundlePath = getRelativeBundlePath('app', paths.output.browser);

const buildBrowserApp = localeCode => () => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);
	const config = getBrowserAppConfig(localeCode);
	return compile(config).then(stats => {
		const relativeBundlePath = getBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
	});
};

module.exports = {
	command: 'browser',
	aliases: 'client',
	description: 'build the client-side renderer bundle',
	builder: yargs => addLocalesOption(yargs),
	handler: argv => {
		console.log(
			chalk.blue('building browser bundle using current vendor bundles')
		);

		if (packageConfig.combineLanguages) {
			buildBrowserApp('combined');
			return;
		}
		// TODO : fork a new child process?
		promiseSerial(argv.locales.map(buildBrowserApp));
	},
};
