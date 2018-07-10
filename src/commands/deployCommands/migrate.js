const chalk = require('chalk');
const apiMiddleware = require('../deployUtils/apiMiddleware');

const { CI_BUILD_NUMBER } = process.env;

module.exports = {
	command: 'migrate',
	describe: 'migrate traffic to a deployed version',
	builder: yargs =>
		yargs.options({
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to migrate traffic to',
			},
			deployCount: {
				default: 1,
				describe:
					'The number of parallel versions that have been deployed',
			},
			incrementWait: {
				default: 60000, // 1 minute
				describe: 'The delay between migration increments',
			},
			incrementPercentage: {
				default: 100,
				describe:
					'The percentage of traffic to migrate in each increment',
			},
			targetTraffic: {
				default: 100,
				describe:
					'The total amount of traffic to be migrated to the deployment',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv =>
		argv.getDeployApi().then(({ versions, migrate }) =>
			migrate().catch(error => {
				console.log(chalk.red(`Migration stopped: ${error}`));
				if (!(error instanceof versions.validate.RedundantError)) {
					// no need to return non-zero exit code for newer deployment
					process.exit(1);
				}
			})
		),
};
