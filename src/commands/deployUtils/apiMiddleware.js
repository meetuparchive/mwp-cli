const chalk = require('chalk');
const getDeploy = require('./deploy');
const getVersions = require('./versions');
const getMigrate = require('./migrate');
const getOperations = require('./operations');
const cloudApi = require('./cloudApi');

const {
	COOKIE_ENCRYPT_SECRET,
	CSRF_SECRET,
	PHOTO_SCALER_SALT,
	NEW_RELIC_APP_NAME,
	NEW_RELIC_LICENSE_KEY,
} = process.env;

const getApi = config => {
	const { auth, appsId, servicesId } = config;

	/*
	* Get the traffic split among deployed versions
	* https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services#TrafficSplit
	*/
	const allocations = () =>
		cloudApi.services
			.get({ auth, appsId, servicesId })
			.then(({ split: { allocations } }) => allocations);
	const operations = getOperations(config);
	const versions = getVersions(config, { allocations, operations });
	const deploy = getDeploy(config, { operations, versions });
	const migrate = getMigrate(config, { allocations, operations, versions });

	return { deploy, migrate, versions, allocations };
};

const validateEnv = envVariables =>
	Object.keys(envVariables).forEach(k => {
		if (!envVariables[k]) {
			throw new Error(`env var ${k} not defined - aborting`);
		}
	});

/*
 * yargs middleware that will directly modify argv
 * this middleware injects a `getDeployApi` function and assigns other properties
 * to argv that are consumed by API methods
 */
const apiMiddleware = argv => {
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
	const getDeployApi = () =>
		cloudApi
			.auth()
			.then(({ auth, appsId }) =>
				getApi(Object.assign({ auth, appsId }, argv))
			);
	Object.assign(argv, { envVariables, getDeployApi, versionIds, indent });
	return argv;
};

module.exports = apiMiddleware;
