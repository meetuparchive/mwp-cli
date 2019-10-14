const yargs = require('yargs');

const run = () =>
	yargs
		.commandDir('commands') // commands are in the './commands/' dir
		.demandCommand() // require a command to be used - no default behavior
		.strict() // show help when unsupported commands/options are used
		.help().argv; // build '--help' output and return parsed args as plain object

module.exports = {
	run,
};
