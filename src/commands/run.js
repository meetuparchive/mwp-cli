const path = require('path');
const chalk = require('chalk');

const startDev = require(path.resolve(__dirname, './run/start-dev'));
console.log(startDev);

module.exports = {
	command: 'run',
	description: 'run the application server',
	builder: yargs => yargs,
	handler: argv => {
		const { NODE_ENV } = process.env;
		console.log(chalk.blue('Running the application server...'));
		console.log(
			chalk.green(`NODE_ENV=${process.env.NODE_ENV || '(empty)'}`)
		);
		if (!NODE_ENV || NODE_ENV === 'development') {
			// check for prerequisites (e.g. up-to-date build/... files)
			// execute the start-dev script
			console.log(chalk.blue('Running the application server...'));
			startDev();
		}
	},
};
