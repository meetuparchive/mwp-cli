const chalk = require('chalk');
const path = require('path');
const webpack = require('webpack');

const {
	getBrowserAppConfig,
	getRelativeBundlePathGetter,
	settings,
} = require('./config/buildUtils');

const getRelativeBundlePath = getRelativeBundlePathGetter(
	'app',
	settings.browserAppOutputPath
);
const buildBrowserApp = localeCode => {
	console.log(
		chalk.blue(`building browser app (${chalk.yellow(localeCode)})...`)
	);
	const config = getBrowserAppConfig(localeCode);
	webpack(config, (err, stats) => {
		const relativeBundlePath = getRelativeBundlePath(stats, localeCode);
		console.log(chalk.blue(`built ${relativeBundlePath}`));
	});
};

module.exports = {
	command: 'browser',
	aliases: 'client',
	description: 'build the client-side renderer bundle',
	builder: yargs => yargs,
	handler: argv => {
		console.log(
			chalk.blue('building browser bundle using current vendor bundles')
		);
		// TODO : fork a new child process?
		argv.locales.forEach(buildBrowserApp);
	},
};
