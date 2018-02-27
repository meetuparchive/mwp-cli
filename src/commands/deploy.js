const chalk = require('chalk');
const runE2E = require('./deployUtils/e2e');
const cloudApi = require('./deployUtils/cloudApi');

const { getApi: _getApi } = require('./deployUtils');

const runE2EWithRetry = id => runE2E(id).catch(() => runE2E(id));
/*
 * Automated migration for gcloud deployments
 * https://cloud.google.com/appengine/docs/admin-api/getting-started/
 * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions
 * https://cloud.google.com/appengine/docs/admin-api/deploying-apps
 * https://cloud.google.com/appengine/docs/admin-api/creating-config-files
 */

const {
	CI_BUILD_NUMBER,
	COOKIE_ENCRYPT_SECRET,
	CSRF_SECRET,
	PHOTO_SCALER_SALT,
	NEW_RELIC_APP_NAME,
	NEW_RELIC_LICENSE_KEY,
} = process.env;

const injectApi = argv => {
	const envVariables = {
		API_HOST: 'api.meetup.com',
		COOKIE_ENCRYPT_SECRET,
		CSRF_SECRET,
		DEV_SERVER_PORT: '8080',
		NEW_RELIC_APP_NAME,
		NEW_RELIC_LICENSE_KEY,
		PHOTO_SCALER_SALT,
	};
	validateEnv(envVariables);

	const versionIds = Array.apply(null, {
		length: argv.deployCount,
	}).map((_, i) => `${argv.version}-${i}`);

	const indent = chalk.yellow(' >');
	const getApi = () =>
		cloudApi
			.auth()
			.then(({ auth, appsId }) =>
				_getApi(Object.assign({ auth, appsId }, argv))
			);
	Object.assign(argv, { envVariables, getApi, versionIds, indent });
	return argv;
};

const validateEnv = envVariables =>
	Object.keys(envVariables).forEach(k => {
		if (!envVariables[k]) {
			throw new Error(`env var ${k} not defined - aborting`);
		}
	});

module.exports = {
	command: 'deploy',
	describe: 'deploy the current application to production',
	builder: yargs =>
		yargs.options({
			version: {
				alias: 'v',
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to deploy',
			},
			servicesId: {
				default: 'default',
				describe: 'The GAE service name',
			},
			incrementWait: {
				default: 60000, // 1 minute
				describe: 'The delay between migration increments',
			},
			incrementPercentage: {
				default: 50,
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
			pollWait: {
				default: 10000, // 10 seconds
				describe: 'The time to wait between progress checks',
			},
			noCanary: {
				describe: 'Disable canary test',
			},
		}),
	handler: argv =>
		argv.getApi().then(({ deploy, versions, migrate }) =>
			versions.validate
				.sufficientQuota()
				.then(deploy.create)
				.then(versions.start)
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
	middlewares: [injectApi],
};
