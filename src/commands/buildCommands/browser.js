const chalk = require('chalk');
const path = require('path');

const { package: packageConfig, paths } = require('mwp-config');

const getBrowserAppConfig = require('./configs/browserAppConfig');
const addLocalesOption = require('../../util/addLocalesOption');
const addBabelOption = require('../../util/addBabelOption');

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

		const babelPath = path.resolve(process.cwd(), argv.babel);
		const babel = require(babelPath);

		if (packageConfig.combineLanguages) {
			return buildBrowserApp('combined', babel)();
		}

		return promiseSerial(argv.locales.map(locale => buildBrowserApp(locale, babel)));
	},
};
