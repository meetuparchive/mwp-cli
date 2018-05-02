const chalk = require('chalk');
const {
	package: packageConfig,
	paths,
} = require('mwp-config');

const getBrowserAppConfig = require('./configs/browserAppConfig');
const addLocalesOption = require('../../util/addLocalesOption');
const {
	compile,
	getRelativeBundlePath,
	promiseSerial,
} = require('../buildUtils/util');

const getBundlePath = getRelativeBundlePath('app', paths.output.browser);

const buildBrowserApp = localeCode => () => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);
	return compile(getBundlePath, localeCode, getBrowserAppConfig(localeCode));
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
			return buildBrowserApp('combined')();
		}

		return promiseSerial(argv.locales.map(buildBrowserApp));
	},
};
