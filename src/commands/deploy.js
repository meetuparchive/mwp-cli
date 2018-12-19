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
				deployCount: {
					default: 1,
					describe:
						'The number of parallel versions that have been deployed',
				},
				env: {
					type: 'array',
					default: [],
					describe:
						'Names of environment variables to pass into deployment from deploy env',
				},
				force: {
					type: 'boolean',
					default: false,
					describe:
						'forces deploy without checking if deployment already exists',
				},
			})
			.commandDir('deployCommands')
			.demandCommand(),
};
