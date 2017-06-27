const chalk = require('chalk');
const path = require('path');
const webpack = require('webpack');

const transpile = require('./util/transpile');
const {
	env,
	getBrowserAppConfig,
	getRelativeBundlePath,
	paths,
} = require('./config');

// set up function for getting the built bundle filename
const getBundlePath = getRelativeBundlePath('app', paths.browserAppOutputPath);

const buildBrowserApp = localeCode => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);
	const config = getBrowserAppConfig(localeCode);
	webpack(config, (err, stats) => {
		const relativeBundlePath = getBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
	});
};

module.exports = {
	command: 'browser',
	aliases: 'client',
	description: 'build the client-side renderer bundle',
	builder: yargs => yargs,
	handler: argv => {
		if (!env.properties.isProd) {
			throw new Error('Local build only supported in NODE_ENV=production')
		}
		console.log(
			chalk.blue('building browser bundle using current vendor bundles')
		);
		// transpile
		transpile('browser');
		// then build browserApp
		argv.locales.forEach(buildBrowserApp);
	},
};
