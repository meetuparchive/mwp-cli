const getDeploy = require('./deploy');
const getVersions = require('./versions');
const getMigrate = require('./migrate');
const getOperations = require('./operations');
const cloudApi = require('./cloudApi');

const getApi = config => {
	const { auth, appsId, servicesId } = config;

	const allocations = () =>
		cloudApi.services
			.get({ auth, appsId, servicesId })
			.then(({ split: { allocations } }) => allocations);
	const operations = getOperations(config);
	const versions = getVersions(config, { allocations, operations });
	const migrate = getMigrate(config, { allocations, operations, versions });
	const deploy = getDeploy(config, { operations, versions });

	/*
   * Get the traffic split among deployed versions
   * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services#TrafficSplit
   */
	const _api = {
		deploy,
		versions,
		migrate,
	};

	return _api;
};

module.exports = {
	getApi,
};
