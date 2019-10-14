const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const mkdirp = require('mkdirp');

const { locales, package: packageConfig, paths } = require('mwp-config');

const getServerAppConfig = require('./configs/serverAppConfig');
const addLocalesOption = require('../../util/addLocalesOption');
const addBabelOption = require('../../util/addBabelOption');

const {
	compile,
	getRelativeBundlePath,
	promiseSerial,
} = require('../buildUtils/util');

const getBundlePath = getRelativeBundlePath('server-app', paths.output.server);

const writeServerAppBundle = (localeCode, babelConfig) => () => {
	console.log(chalk.blue(`building server app (${chalk.yellow(localeCode)})...`));

	return compile(
		getBundlePath,
		localeCode,
		getServerAppConfig(localeCode, babelConfig)
	).catch(error => {
		console.error(error);
		process.exit(1);
	});
};

/*
 * Write a file that maps supported localeCodes to their corresponding server
 * rendering bundles. Note that this function doesn't care whether the bundles
 * actually exist - it just assumes that when the created 'map' module is
 * executed, the target bundles will be in place.
 */
function writeServerAppMap(localeCodes, isCombined) {
	// The first step is building an array of localeCode-bundlePath pairs
	// in the form ['<localeCode>: require(<bundlePath>).default', ...]
	const codeBundlePairStrings = localeCodes.reduce((acc, localeCode) => {
		const serverAppPath = path.resolve(
			paths.output.server,
			isCombined
				? 'combined' // point to /combined/ for all languages
				: localeCode, // point to language-specific directory
			'server-app'
		);
		const requireString = `require('${serverAppPath}').default`;
		acc.push(`'${localeCode}': ${requireString}`);
		return acc;
	}, []);
	// now inject the pairs into a stringified Object
	// **note** This doesn't use JSON.stringify because we don't want the
	// `require` statements to either be _evaluated_ or treated as a string
	const serverAppMapString = `{${codeBundlePairStrings.join(',')}}`;

	// finally, write the module that exports the map
	mkdirp.sync(path.dirname(paths.output.serverMap)); // ensure dir exists
	fs.writeFileSync(
		paths.output.serverMap,
		`module.exports = ${serverAppMapString};`
	);
}

module.exports = {
	command: 'server',
	description: 'build the server-side renderer bundle',
	builder: yargs => {
		addLocalesOption(yargs);
		addBabelOption(yargs);
	},
	handler: argv => {
		console.log(
			chalk.blue('building server bundle using current vendor bundles')
		);

		/**
		 * babelConfig is a file specified by the consumer app
		 * that supplies options to babel-loader and webpack
		 *
		 * e.g. `mope build server --babelConfig=./babel.config.server.js`
		 *
		 * @see mwp-cli/src/commands/buildCommands/configs/rules.js
		 */
		const babelConfig = require(path.resolve(process.cwd(), argv.babelConfig));

		if (packageConfig.combineLanguages) {
			return writeServerAppBundle('combined', babelConfig)().then(() => {
				writeServerAppMap(locales, true); // write an app map that covers _all_ locales
			});
		}

		return promiseSerial(
			argv.locales.map(locale => writeServerAppBundle(locale, babelConfig))
		).then(() => writeServerAppMap(argv.locales));
	},
	writeServerAppBundle,
	writeServerAppMap,
};
