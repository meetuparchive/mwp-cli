const chalk = require('chalk');

module.exports = {
	command: 'browser',
	aliases: 'client',
	description: 'build the client-side renderer bundle',
	builder: yargs => yargs,
	handler: argv => {
		console.log('building the client');
		console.log(chalk.yellow('Command not implemented'));
		// fork a process that will build the browser bundle.
		// The process will use a local webpack config builder,
		// which will use a `process.cwd()`-relative path to
		// find the browser-app-entry file, and use a similar
		// relative path to set the `output.path`
	},
};
