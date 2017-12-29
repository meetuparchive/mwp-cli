const chalk = require('chalk');
const cloudApi = require('./cloudApi');

module.exports = (config, { versions, operations }) => {
	const { auth, appsId, servicesId, version, versionIds } = config;
	const logOp = id => op => {
		console.log(
			chalk.green(`Creating version ${id} for ${op.metadata.user}\n`),
			chalk.yellow(`Operation ${op.name} in progress`)
		);
		return op;
	};
	const createVersion = id =>
		cloudApi.versions
			.create({
				auth,
				appsId,
				servicesId,
				resource: versions.spec(id),
			})
			.then(logOp(id))
			.then(operations.version);

	return {
		create: () => {
			const { noExisting, noNewer } = versions.validate;
			console.log(
				`Creating ${version} deployment:`,
				`versions ${versionIds.join(', ')}`
			);
			return Promise.all([noExisting(), noNewer()]).then(() =>
				Promise.all(versionIds.map(createVersion))
			);
		},
		del: () =>
			versions
				.stop(versionIds.map(id => ({ id })))
				.then(() => Promise.all(versionIds.map(versions.deleteSafe))),
	};
};
