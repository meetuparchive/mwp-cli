const yargs = require('yargs');
const supportedLocales = require('./util/supportedLocales');
const defaultLocales = NODE_ENV === 'production'
	? supportedLocales
	: supportedLocales.slice(0, 1); // default to top locale in dev

const run = () => {
	const argv = yargs
		.commandDir('commands') // commands are in the './commands/' dir
		.demandCommand() // require a command to be used - no default behavior
		.array('locales') // treat locales as array, always
		.option('locales', {
			default: defaultLocales,
			description: 'localeCodes to build the app for',
		})
		.strict() // show help when unsupported commands/options are used
		.help().argv; // build '--help' output and return parsed args as plain object

	/** The following will be run whenever CLI is run **/
	console.debug(argv);
};
module.exports = {
	run,
};
