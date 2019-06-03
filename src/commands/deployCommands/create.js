const path = require('path');
const { paths } = require('mwp-config');
const chalk = require('chalk');
const apiMiddleware = require('../deployUtils/apiMiddleware');

const baseConfig = require(path.resolve(paths.repoRoot, 'app.json'));

/*
 * Automated migration for gcloud deployments
 * https://cloud.google.com/appengine/docs/admin-api/getting-started/
 * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions
 * https://cloud.google.com/appengine/docs/admin-api/deploying-apps
 * https://cloud.google.com/appengine/docs/admin-api/creating-config-files
 */

const { CI_BUILD_NUMBER } = process.env;
const ACCEPTABLE_FAILURE = 1;
const UNACCEPTABLE_FAILURE = 2;

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
		}),
	middlewares: [apiMiddleware],
	handler: argv =>
		argv.getDeployApi().then(({ deploy, versions }) =>
			versions.validate
				.sufficientQuota()
				.then(deploy.create)
				.catch(error => {
					console.log(chalk.red(`Stopping deployment: ${error}`));
					console.log(chalk.red('Cleaning up failed deployment...'));

					const exitCode = error.includes('already deployed')
						? ACCEPTABLE_FAILURE
						: UNACCEPTABLE_FAILURE;
					return deploy.del().then(() => process.exit(exitCode));
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
