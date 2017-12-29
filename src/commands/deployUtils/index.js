const getDeploy = require('./deploy');
const getVersions = require('./versions');
const getMigrate = require('./migrate');
const getOperations = require('./operations');
const cloudApi = require('./cloudApi');

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

	return { deploy, migrate, versions };
};

module.exports = { getApi };
