const chalk = require('chalk');
const startDev = require('./runScripts/start-dev');
const addBabelOption = require('../util/addBabelOption');

module.exports = {
	command: 'run',
	description: 'run the application server',
	builder: yargs => {
		yargs.option('log-static');
		addBabelOption(yargs);
	},
	handler: argv => {
		const { NODE_ENV } = process.env;
		const envString = NODE_ENV || 'development';

		console.log(chalk.gray(`NODE_ENV=${envString}`));

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

		// execute the start-dev script
		startDev(argv.babelConfig);

		return;
	},
};
