const path = require('path');
const chalk = require('chalk');

const addLocalesOption = require('../util/addLocalesOption');
const startDev = require('./runScripts/start-dev');

module.exports = {
	command: 'run',
	description: 'run the application server',
	builder: yargs => addLocalesOption(yargs).option('log-static'),
	handler: argv => {
		const { NODE_ENV } = process.env;
		const envString = NODE_ENV || 'development';
		console.log(chalk.green(`NODE_ENV=${envString}`));
		if (envString !== 'development') {
			console.log(
				chalk.red(`Cannot run dev server with NODE_ENV=${envString}`)
			);
			console.log(chalk.red(`Set NODE_ENV=development`));
			process.exit(1);
		}
		if (argv['log-static']) {
			process.env.DEBUG = 'express:router';
		}
		// TODO: check for prerequisites (e.g. up-to-date build/... files)
		// execute the start-dev script
		console.log(chalk.blue('Preparing the dev app server...'));
		startDev(argv.locales);
		return;
	},
};
