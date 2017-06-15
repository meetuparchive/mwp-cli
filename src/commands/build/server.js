const chalk = require('chalk');

module.exports = {
	command: 'server',
	description: 'build the server-side renderer bundle',
	builder: yargs => yargs,
	handler: argv => {
		console.log('building the server app');
		console.log(chalk.yellow('Command not implemented'));
	},
};
