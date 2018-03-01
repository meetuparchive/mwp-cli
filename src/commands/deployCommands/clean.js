const apiMiddleware = require('../deployUtils/apiMiddleware');

const stopOldVersions = (serving, api, versions) =>
	api
		.allocations()
		.then(allocs => {
			const runningVersions = versions.filter(
				v => v.servingStatus === 'SERVING'
			);
			const servingIds = Object.keys(allocs);
			console.log('Currently serving traffic:', servingIds.join(', '));
			console.log(
				'Currently available to serve:',
				runningVersions.map(({ id }) => id).join(', ')
			);
			const oldestAllocIndex = runningVersions.reduce(
				(oldestI, v, i) => (servingIds.includes(v.id) ? i : oldestI),
				-1
			);

			const stopIndex = Math.max(oldestAllocIndex + serving, 0);
			const versionsToStop = runningVersions.slice(stopIndex);
			console.log(
				'Stopping version(s):',
				versionsToStop.map(({ id }) => id).join(', ')
			);
			// return the versions that should be stopped
			return versionsToStop;
		})
		.then(api.versions.stop);

const deleteOldestVersions = (available, api, versions) => {
	const versionsToDelete = versions
		.slice(Math.max(available, 0))
		.map(({ id }) => id);
	console.log(`Deleting version(s): ${versionsToDelete.join(', ')}`);
	return Promise.all(versionsToDelete.map(api.versions.deleteSafe));
};

module.exports = {
	command: 'clean',
	description: 'stop older versions, delete oldest versions',
	builder: yargs =>
		yargs.options({
			serving: {
				default: 3,
				describe: 'Minimum number of versions to keep serving',
			},
			available: {
				default: 20,
				describe: 'Number of versions to keep available',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv => {
		return argv
			.getDeployApi()
			.then(api =>
				api.versions.get().then(versions => {
					const sortedVersions = versions.sort(
						({ createTime: a }, { createTime: b }) => {
							if (a > b) return -1;
							if (a < b) return 1;
							return 0;
						}
					);
					return Promise.all([
						stopOldVersions(argv.serving, api, sortedVersions),
						deleteOldestVersions(
							argv.available,
							api,
							sortedVersions
						),
					]);
				})
			)
			.catch(err => console.error(err));
	},
};
