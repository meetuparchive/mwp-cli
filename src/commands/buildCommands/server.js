const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const mkdirp = require('mkdirp');
const webpack = require('webpack');

const addLocalesOption = require('../../util/addLocalesOption');
const {
	paths,
	webpack: { getServerAppConfig, getRelativeBundlePath },
} = require('../../config');

const getBundlePath = getRelativeBundlePath('server-app', paths.output.server);

const writeServerAppBundle = localeCode => {
	console.log(
		chalk.blue(`building server app (${chalk.yellow(localeCode)})...`)
	);
	// get the locale-specific config
	const config = getServerAppConfig(localeCode);
	webpack(config, (err, stats) => {
		const relativeBundlePath = getBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
	});
};

/*
 * Write a file that maps supported localeCodes to their corresponding server
 * rendering bundles. Note that this function doesn't care whether the bundles
 * actually exist - it just assumes that when the created 'map' module is
 * executed, the target bundles will be in place.
 */
function writeServerAppMap(localeCodes) {
	// The first step is building an array of localeCode-bundlePath pairs
	// in the form ['<localeCode>: require(<bundlePath>).default', ...]
	const codeBundlePairStrings = localeCodes.reduce((acc, localeCode) => {
		const serverAppPath = path.resolve(
			paths.output.server,
			localeCode,
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
	builder: yargs => addLocalesOption(yargs),
	handler: argv => {
		console.log(
			chalk.blue('building server bundle using current vendor bundles')
		);
		// TODO: make this run in parallel, not just concurrently
		argv.locales.forEach(writeServerAppBundle);
		writeServerAppMap(argv.locales);
	},
};
