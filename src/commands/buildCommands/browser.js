const chalk = require('chalk');
const { package: packageConfig, paths } = require('mwp-config');

const getBrowserAppConfig = require('./configs/browserAppConfig');
const addLocalesOption = require('../../util/addLocalesOption');
const {
	compile,
	getRelativeBundlePath,
	promiseSerial,
} = require('../buildUtils/util');

const getBundlePath = getRelativeBundlePath('app', paths.output.browser);

const buildBrowserApp = (localeCode, babel) => () => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);
	return compile(
		getBundlePath,
		localeCode,
		getBrowserAppConfig(localeCode, babel)
	).catch(error => {
		console.error(error);
		process.exit(1);
	});
};

const addBabelOption = yargs => {
	yargs.option('babel', {
		alias: 'config',
		description: 'path for babel config',
		demandOption: true,
		type: 'string'
	});
};

module.exports = {
	command: 'browser',
	aliases: 'client',
	description: 'build the client-side renderer bundle',
	builder: yargs => {
		addLocalesOption(yargs);
		addBabelOption(yargs);
	},
	handler: argv => {
		console.log(
			chalk.blue('building browser bundle using current vendor bundles')
		);

		const babel = require(argv.babel);

		if (packageConfig.combineLanguages) {
			return buildBrowserApp('combined', babel)();
		}

		return promiseSerial(argv.locales.map(locale => buildBrowserApp(locale, babel)));
	},
};
