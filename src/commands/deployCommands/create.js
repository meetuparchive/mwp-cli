const chalk = require('chalk');
const runE2E = require('../deployUtils/e2e');
const apiMiddleware = require('../deployUtils/apiMiddleware');

const runE2EWithRetry = id => runE2E(id).catch(() => runE2E(id));
/*
 * Automated migration for gcloud deployments
 * https://cloud.google.com/appengine/docs/admin-api/getting-started/
 * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions
 * https://cloud.google.com/appengine/docs/admin-api/deploying-apps
 * https://cloud.google.com/appengine/docs/admin-api/creating-config-files
 */

const { CI_BUILD_NUMBER } = process.env;

module.exports = {
	command: 'create',
	describe: 'deploy the current application to production',
	builder: yargs =>
		yargs.options({
			version: {
				alias: 'v',
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to deploy',
			},

			image: {
				demandOption: true,
				describe: 'The source Docker image tag for the version',
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
			maxInstances: {
				default: 196,
				describe:
					'The maximum number of available instances in a GAE deployment',
			},
			deployCount: {
				default: 1,
				describe: 'The number of parallel versions to deploy',
			},
			targetTraffic: {
				default: 100,
				describe:
					'The total amount of traffic to be migrated to the deployment',
			},
			noCanary: {
				describe: 'Disable canary test',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv =>
		argv.getDeployApi().then(({ deploy, versions, migrate }) =>
			versions.validate
				.sufficientQuota()
				.then(deploy.create)
				.then(
					() =>
						argv.noCanary ||
						Promise.all(argv.versionIds.map(runE2EWithRetry))
				)
				.catch(error => {
					console.log(chalk.red(`Stopping deployment: ${error}`));
					console.log(chalk.red('Cleaning up failed deployment...'));
					// clean up deployed versions and exit
					return deploy.del().then(() => process.exit(1));
				})
				.then(() =>
					migrate().catch(error => {
						console.log(chalk.red(`Migration stopped: ${error}`));
						if (
							!(error instanceof versions.validate.RedundantError)
						) {
							// no need to return non-zero exit code for newer deployment
							process.exit(1);
						}
					})
				)
		),
};
