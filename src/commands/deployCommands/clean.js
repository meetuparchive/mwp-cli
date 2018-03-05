const apiMiddleware = require('../deployUtils/apiMiddleware');

const sortByStartTime = versions =>
	versions.sort(({ createTime: a }, { createTime: b }) => {
		if (a > b) return -1;
		if (a < b) return 1;
		return 0;
	});

/*
 * This function will stop 'old' deployments, leaving a specified minimum number
 * still 'warm' and available to serve production traffic. It is 'safe', in that
 * it attempts to guarantee not to stop any version that is currently serving
 * traffic. In addition, it guarantees not to stop any version _newer_ than the
 * oldest version currently allocated production traffic.
 */
const stopOldVersions = (serving, api, versions) =>
	// find out which versions are currently serving traffic (allocations)
	api
		.allocations()
		.then(allocs => {
			// only interested in 'warm' versions - ignore previously-stopped versions
			const runningVersions = versions.filter(
				v => v.servingStatus === 'SERVING'
			);
			const servingIds = Object.keys(allocs);
			console.log('Currently serving traffic:', servingIds.join(', '));
			console.log(
				'Currently available to serve:',
				runningVersions.map(({ id }) => id).join(', ')
			);
			// find the oldest version that is currently serving prod traffic
			const oldestAllocIndex = runningVersions.reduce(
				(oldestI, v, i) => (servingIds.includes(v.id) ? i : oldestI),
				-1
			);
			if (oldestAllocIndex === -1) {
				throw new Error(
					'no versions currently serving traffic - check status and retry'
				);
			}

			// only stop versions that are _older_ than oldest currently-serving version
			const stopIndex = oldestAllocIndex + serving;
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
				api.versions
					.get()
					.then(sortByStartTime)
					.then(sortedVersions =>
						Promise.all([
							stopOldVersions(argv.serving, api, sortedVersions),
							deleteOldestVersions(
								argv.available,
								api,
								sortedVersions
							),
						])
					)
			)
			.catch(err => console.error(err));
	},
};
