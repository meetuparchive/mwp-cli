const yargs = require('yargs');

const run = () => {
	const argv = yargs
		.commandDir('commands') // commands are in the './commands/' dir
		.demandCommand() // require a command to be used - no default behavior
		.strict() // show help when unsupported commands/options are used
		.help().argv; // build '--help' output and return parsed args as plain object

	/** The following will be run whenever CLI is run **/
	console.debug(argv);
};
module.exports = {
	run,
};
