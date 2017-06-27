const supportedLocales = require('../util/supportedLocales');
const defaultLocales = process.env.NODE_ENV === 'production'
	? supportedLocales
	: supportedLocales.slice(0, 1); // default to top locale in dev

module.exports = {
	command: 'build',
	description: 'build application rendering bundle(s)',
	builder: yargs => yargs
		.commandDir('buildCommands')
		.demandCommand()
		.array('locales') // treat locales as array, always
		.option('locales', {
			default: defaultLocales,
			description: 'localeCodes to build the app for',
		}),
};
