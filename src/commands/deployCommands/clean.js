const apiMiddleware = require('../deployUtils/apiMiddleware');

const stopOldVersions = (serving, api, versions) =>
	Promise.all(
		api.allocations(),
		api.versions.instances.running(versions)
	).then(([allocs, runningVersions]) => {
		// runningVersions is ordered by start time, so we can find out
		// where to STOP by adding `serving` to `indexOf` the last item serving traffic
		const servingIds = Object.keys(allocs);
		const oldestAllocIndex = runningVersions.reduce(
			(oldestI, v, i) => (servingIds.includes(v.id) ? i : oldestI),
			-1
		);
		console.log(runningVersions.slice(oldestAllocIndex + serving - 1));
	});
// .then(api.versions.stop);

const deleteOldestVersions = (available, api, versions) => {
	const versionsToDelete = versions.slice(available - 1).map(({ id }) => id);
	console.log(versionsToDelete);
	// return api.versions.deleteSafe(versionsToDelete);
};

module.exports = {
	command: 'clean',
	description: 'stop older versions, delete oldest versions',
	builder: yargs =>
		yargs.options({
			serving: {
				default: 4,
				describe: 'Minimum number of versions to keep serving',
			},
			available: {
				default: 25,
				describe: 'Number of versions to keep available',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv => {
		return argv
			.getDeployApi()
			.then(api =>
				api.versions
					.get()
					.then(versions =>
						Promise.all(
							stopOldVersions(argv.serving, api, versions),
							deleteOldestVersions(argv.available, api, versions)
						)
					)
			)
			.catch(err => console.error(err));
	},
};
