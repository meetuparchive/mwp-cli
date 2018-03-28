const path = require('path');
const chalk = require('chalk');
const { paths } = require('mwp-config');
const cloudApi = require('./cloudApi');

const flattenArray = arrays => [].concat.apply([], arrays);
class RedundantError extends Error {}

module.exports = (config, { operations, allocations }) => {
	// don't load config until this function is called
	const baseConfig = require(path.resolve(paths.repoRoot, 'app.json'));
	const {
		auth,
		appsId,
		deployCount,
		minInstances,
		maxInstances,
		servicesId,
		envVariables,
		image,
		versionIds,
		indent,
	} = config;

	// special wrapper around operations.track that prints version serving status
	const trackOperation = op =>
		operations.track(op).then(version =>
			cloudApi.versions
				.get({
					auth,
					appsId,
					versionsId: version.id,
					servicesId,
				})
				.then(v => {
					console.log(indent, 'serving status:', v.servingStatus);
					return v;
				})
		);

	const instances = {
		list: ({ id: versionsId }) =>
			cloudApi.versions.instances
				.list({ auth, appsId, servicesId, versionsId })
				.then(response => response.instances),
	};

	instances.running = versions => {
		const runningVersions = versions.filter(
			v => v.servingStatus === 'SERVING'
		);
		const instanceFetches = runningVersions.map(instances.list);
		return Promise.all(instanceFetches).then(flattenArray);
	};

	const spec = id =>
		// https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions#Version
		Object.assign(
			{
				id,
				deployment: { container: { image } },
				envVariables,
				automaticScaling: Object.assign(
					baseConfig.automaticScaling || {},
					{
						minTotalInstances: minInstances,
					}
				),
			},
			baseConfig
		);

	const get = () => {
		console.log('Getting current version list');
		return cloudApi.versions
			.list({ auth, appsId, servicesId, pageSize: 50, view: 'FULL' })
			.then(response => response.versions);
	};

	const validate = {
		noExisting: () =>
			allocations().then(allocations =>
				Object.keys(allocations).forEach(id => {
					if (config.versionIds.includes(id)) {
						throw new Error(`${id} already deployed`);
					}
				})
			),
		noNewer: () => {
			console.log('Checking for newer deployed version...');
			return get().then(versions => {
				versions.reverse(); // newest first
				const myVersions = versions.filter(v =>
					versionIds.includes(v.id)
				);
				if (myVersions.length > 0) {
					const newerVersions = versions
						.filter(v => !versionIds.includes(v.id))
						.filter(v => v.createTime > myVersions[0].createTime);
					if (newerVersions.length > 0) {
						throw new RedundantError(
							'Newer version deployed',
							newerVersions[0].id
						);
					}
				}
				console.log(indent, 'No newer version deployed, continuing...');
				return versions;
			});
		},
		sufficientQuota: () =>
			get().then(instances.running).then(instances => {
				const total = instances.length;
				const available = maxInstances - total;
				const required = minInstances * deployCount;
				console.log(
					indent,
					`${total} instances in use`,
					`(${available} available,`,
					`${required} required)`
				);
				if (available < required) {
					throw new Error('Not enough quota available');
				}
			}),
		noTraffic: id =>
			allocations().then(allocations => {
				if (Object.keys(allocations).includes(id)) {
					throw new Error(`${id} is serving traffic`);
				}
				return id;
			}),
	};
	// add RedundantError as a prop so that it can be imported by other modules
	validate.RedundantError = RedundantError;

	const patch = ({ id: versionsId, updateMask, resource }) =>
		cloudApi.versions
			.patch({
				auth,
				appsId,
				servicesId,
				versionsId,
				updateMask,
				resource,
			})
			.then(op => {
				console.log(
					chalk.green(
						`Setting ${JSON.stringify(resource)}`,
						`for version ${versionsId} for ${op.metadata.user}\n`
					),
					chalk.yellow(`Operation ${op.name} in progress`)
				);
				return op;
			})
			.then(trackOperation);

	const start = versions =>
		Promise.all(
			versions.map(({ id }) =>
				patch({
					id,
					updateMask: 'servingStatus',
					resource: { servingStatus: 'SERVING' },
				})
			)
		);

	const stop = versions =>
		Promise.all(
			versions.map(({ id }) =>
				validate.noTraffic(id).then(v =>
					patch({
						id,
						updateMask: 'servingStatus',
						resource: { servingStatus: 'STOPPED' },
					})
				)
			)
		);

	// Delete a version, but only if it's not serving traffic
	const del = id =>
		validate
			.noTraffic(id)
			.then(id =>
				cloudApi.versions.del({
					auth,
					appsId,
					servicesId: config.servicesId,
					versionsId: id,
				})
			)
			.then(operations.track);

	// delete the version but swallow errors to stop the cascade of failure
	const deleteSafe = id =>
		del(id).catch(error =>
			console.log(chalk.red(`Could not delete version ${id}: ${error}`))
		);
	const logOp = id => op => {
		console.log(
			chalk.green(`Creating version ${id} for ${op.metadata.user}\n`),
			chalk.yellow(`Operation ${op.name} in progress`)
		);
		return op;
	};
	const create = id =>
		cloudApi.versions
			.create({
				auth,
				appsId,
				servicesId,
				resource: spec(id),
			})
			.then(logOp(id))
			.then(trackOperation);

	const versions = {
		create,
		spec,
		get,
		patch,
		start,
		stop,
		del,
		deleteSafe,
		instances,
		validate,
	};
	return versions;
};
