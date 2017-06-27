const path = require('path');
const chalk = require('chalk');

const startDev = require('./runScripts/start-dev');

module.exports = {
	command: 'run',
	description: 'run the application server',
	handler: argv => {
		const { NODE_ENV } = process.env;
		console.log(
			chalk.green(`NODE_ENV=${process.env.NODE_ENV || '(empty)'}`)
		);
		if (!NODE_ENV !== 'production') {
			// TODO: check for prerequisites (e.g. up-to-date build/... files)
			// execute the start-dev script
			console.log(chalk.blue('Running the dev app server...'));
			startDev();
		}
	},
};
