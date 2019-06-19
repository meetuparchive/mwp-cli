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

const buildBrowserApp = (localeCode, babelConfig) => () => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);

	return compile(
		getBundlePath,
		localeCode,
		getBrowserAppConfig(localeCode, babelConfig)
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

		/**
		 * babelConfig is a file specified by the consumer app
		 * that supplies options to babel-loader and webpack
		 *
		 * e.g. `mope build browser --babelConfig=./babel.config.js`
		 *
		 * @see mwp-cli/src/commands/buildCommands/configs/rules.js
		 */
		const babelConfig = require(path.resolve(process.cwd(), argv.babelConfig));

		if (packageConfig.combineLanguages) {
			return buildBrowserApp('combined', babelConfig)();
		}

		return promiseSerial(argv.locales.map(locale => buildBrowserApp(locale, babelConfig)));
	},
};
