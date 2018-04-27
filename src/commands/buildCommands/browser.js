const chalk = require('chalk');
const addLocalesOption = require('../../util/addLocalesOption');
const { compile, promiseSerial } = require('../buildUtils/util');

const {
	package: packageConfig,
	paths,
	webpack: { getBrowserAppConfig, getRelativeBundlePath },
} = require('mwp-config');

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
