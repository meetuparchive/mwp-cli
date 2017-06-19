const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const webpack = require('webpack');
const {
	getServerAppConfig,
	getRelativeBundlePathGetter,
	paths,
} = require('./config');

const getRelativeBundlePath = getRelativeBundlePathGetter(
	'server-app',
	paths.serverAppOutputPath
);

const writeServerAppBundle = localeCode => {
	console.log(
		chalk.blue(`building server app (${chalk.yellow(localeCode)})...`)
	);
	// get the locale-specific config
	const config = getServerAppConfig(localeCode);
	webpack(config, (err, stats) => {
		const relativeBundlePath = getRelativeBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
	});
};

function writeServerAppMap(localeCodes) {
	// When the server apps are built, we write a file that exports all of the
	// newly-built bundles.
	// The first step is building an array of localeCode-bundlePath pairs
	// in the form ['<localeCode>: require(<bundlePath>).default', ...]
	const codeBundlePairStrings = localeCodes.reduce((acc, localeCode) => {
		const serverAppPath = path.resolve(
			paths.serverAppOutputPath,
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
	fs.writeFileSync(
		paths.serverAppModulePath,
		`module.exports = ${serverAppMapString};`
	);
}
module.exports = {
	command: 'server',
	description: 'build the server-side renderer bundle',
	builder: yargs => yargs,
	handler: argv => {
		console.log(
			chalk.blue('building server bundle using current vendor bundles')
		);
		// TODO: make this run in parallel, not just concurrently
		argv.locales.forEach(writeServerAppBundle);
		// TODO: don't write app map until server app bundles complete
		writeServerAppMap(argv.locales);
	},
};
