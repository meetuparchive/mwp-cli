module.exports = {
	command: 'deploy',
	describe: 'deploy the current application to production',
	builder: yargs =>
		yargs
			.options({
				servicesId: {
					default: 'default',
					describe: 'The GAE service name',
				},
			})
			.commandDir('deployCommands')
			.demandCommand(),
};
