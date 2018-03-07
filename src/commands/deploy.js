const { package: packageConfig } = require('mwp-config');
module.exports = {
	command: 'deploy',
	describe: 'deploy the current application to production',
	builder: yargs =>
		yargs
			.options({
				servicesId: {
					default: packageConfig.gaeModuleId,
					describe: 'The GAE service name',
				},
				pollWait: {
					default: 10000, // 10 seconds
					describe: 'The time to wait between progress checks',
				},
			})
			.commandDir('deployCommands')
			.demandCommand(),
};
