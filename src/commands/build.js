module.exports = {
	command: 'build',
	description: 'build application rendering bundle(s)',
	builder: yargs =>
		yargs
			.commandDir('build')
			.demandCommand()
			.array('locales') // treat locales as array, always
			.option('locales', {
				default: ['en-US'],
				description: 'localeCodes to build the app for',
			}),
};
