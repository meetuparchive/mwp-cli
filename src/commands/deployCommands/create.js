const path = require('path');
const { paths } = require('mwp-config');
const chalk = require('chalk');
const runE2E = require('../deployUtils/e2e');
const apiMiddleware = require('../deployUtils/apiMiddleware');

const baseConfig = require(path.resolve(paths.repoRoot, 'app.json'));

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
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to deploy',
			},

			image: {
				demandOption: true,
				describe: 'The source Docker image tag for the version',
			},
			minInstances: {
				default:
					(baseConfig.automaticScaling || {}).minTotalInstances || 16,
				describe: 'Minimum instances per deployment',
			},
			maxInstances: {
				default: 196,
				describe:
					'The maximum number of available instances in a GAE deployment',
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
				.then(() => {
					console.log(
						chalk.green(
							`${argv.versionId} ready to receive traffic`
						)
					);
				})
		),
};
