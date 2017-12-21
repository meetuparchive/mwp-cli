const { promisify } = require('util');
const google = require('googleapis');
const chalk = require('chalk');

const gapi = google.appengine('v1').apps;
const baseConfig = require('../app.json');
const runE2E = require('./e2e');

// promisified API (callbacks are annoying)
const api = {
	operations: {
		get: promisify(gapi.operations.get),
	},
	versions: {
		list: promisify(gapi.services.versions.list),
		get: promisify(gapi.services.versions.get),
		create: promisify(gapi.services.versions.create),
		patch: promisify(gapi.services.versions.patch),
	},
	instances: {
		list: promisify(gapi.services.versions.instances.list),
	},
	services: {
		get: promisify(gapi.services.get),
		patch: promisify(gapi.services.patch),
	},
};

const INDENT = chalk.yellow(' >');

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

const validateEnv = envVariables =>
	Object.keys(envVariables).forEach(k => {
		if (!envVariables[k]) {
			throw new Error(`env var ${k} not defined - aborting`);
		}
	});

const flattenArray = arrays => [].concat.apply([], arrays);

const createVersionSpec = ({ appsId, id, config }) =>
	// https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services.versions#Version
	Object.assign(
		{
			id,
			deployment: {
				container: {
					image: `us.gcr.io/${appsId}/mup-web:${config.version}`,
				},
			},
			envVariables: config.envVariables,
		},
		baseConfig
	);

const getVersions = ({ auth, appsId, config }) => {
	console.log('Getting current version list');
	return api.versions
		.list({
			auth,
			appsId,
			servicesId: config.servicesId,
			pageSize: 50,
			view: 'FULL',
		})
		.then(response => response.versions);
};

const checkForNewerVersion = ({ auth, appsId, config }) => {
	console.log('Checking for newer deployed version...');
	return getVersions({ auth, appsId, config }).then(versions => {
		versions.reverse(); // newest first
		const myVersions = versions.filter(v =>
			config.versionIds.includes(v.id)
		);
		const otherVersions = versions.filter(
			v => !config.versionIds.includes(v.id)
		);
		if (
			myVersions.length > 0 &&
			otherVersions.some(v => v.createTime > myVersions[0].createTime)
		) {
			throw new Error('Newer version deployed');
		}
		console.log(INDENT, 'No newer version deployed, continuing...');
		return versions;
	});
};

const getInstances = ({ auth, appsId }) => v =>
	api.instances
		.list({ auth, appsId, servicesId: config.servicesId, versionsId: v.id })
		.then(response => response.instances);

const getRunningInstances = ({ auth, appsId }) => versions => {
	const runningVersions = versions.filter(v => v.servingStatus === 'SERVING');
	const instanceFetches = runningVersions.map(getInstances({ auth, appsId }));
	return Promise.all(instanceFetches).then(flattenArray);
};

const checkForQuota = ({ auth, appsId, config }) =>
	getVersions({ auth, appsId, config })
		.then(getRunningInstances({ auth, appsId }))
		.then(instances => {
			const total = instances.length;
			const available = config.maxInstances - total;
			const required =
				baseConfig.automaticScaling.minTotalInstances *
				config.deployCount;
			console.log(
				INDENT,
				`${total} instances in use`,
				`(${available} available,`,
				`${required} required)`
			);
			if (available < required) {
				throw new Error('Not enough quota available');
			}
		});

/*
   * Long-running processes in GCP will be assigned an 'operation' that can be polled
   * to determine its status. This function polls for operation data every config.pollWait
   * millseconds and logs summary information until the operation is marked 'done'
   *
   * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.operations
   */
const checkOperation = ({ auth, appsId }) => {
	let currentStatus = '';
	const doCheck = operation =>
		api.operations
			.get({
				auth,
				appsId,
				operationsId: operation.name.match(/\/([^/]+)$/)[1],
			})
			.then(op => {
				const status = op.metadata.ephemeralMessage || 'processing...';
				if (status !== currentStatus) {
					console.log(INDENT, 'status:', chalk.yellow(status));
					currentStatus = status;
				}
				if (op.done) {
					// when `done` is `true`, op.response will be the entity operated on
					console.log(INDENT, 'status:', chalk.green('Done'));
					if (op.error) {
						throw new Error(op.error);
					}
					return op.response;
				}
				// recurse after timeout
				console.log(
					chalk.gray(`waiting ${config.pollWait / 1000}sec...`)
				);
				return new Promise(resolve =>
					setTimeout(() => {
						resolve(doCheck(op));
					}, config.pollWait)
				);
			});
	return doCheck;
};

/*
   * Get the traffic split among deployed versions
   * https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.services#TrafficSplit
   */
const getSplit = ({ auth, appsId }) => () =>
	api.services
		.get({ auth, appsId, servicesId: config.servicesId })
		.then(({ split: { allocations } }) => allocations);

/*
   * Pretty-print the allocation details - optionally print 'current ➜ next'
   * allocations if new
   */
const logAllocations = (oldAllocations, newAllocations) => {
	console.log('Traffic allocations:');
	const allAllocations = Object.assign({}, oldAllocations, newAllocations);
	Object.keys(allAllocations).forEach(id => {
		const oldAllocation = oldAllocations[id] || 0;
		const baseAllocation = `${chalk.yellow(id)}:\t${oldAllocation}%`;
		if (!newAllocations) {
			console.log(baseAllocation);
			return;
		}
		const newAllocation = newAllocations[id];
		const color = oldAllocation < newAllocation ? chalk.green : chalk.red;
		console.log(`${baseAllocation}\t➜\t${color(newAllocation)}%`);
	});
};

const formatAllocationsToInt = decAllocations =>
	Object.keys(decAllocations).reduce((alloc, id) => {
		alloc[id] = decAllocations[id] * 100;
		return alloc;
	}, {});
const formatAllocationsToDecimal = intAllocations =>
	Object.keys(intAllocations).reduce((decAllocations, id) => {
		if (intAllocations[id] === 0) {
			return decAllocations;
		}
		decAllocations[id] = intAllocations[id] / 100;
		return decAllocations;
	}, {});

/*
   * Based on the current allocations, determine what the next iteration of traffic
   * allocations should be based on config
   *
   * *Important note about rounding* - the 'allocations' object has the following
   * constraints
   *
   * - each value must be (0 < value <= 1) - it cannot be '0', but it can be '1'
   * - the total of all values must be exactly equal to 1
   * - only two decimal places are allowed. '0.1' is okay, but '0.111' is not
   *
   * Because of these constraints and Javascript's poor handling of floating point
   * numbers (`0.3 - 0.1 = 0.199999...`), all values are multiplied by 100 at the
   * beginning of the function and divided by 100 in the return value.
   *
   * This function will deallocate traffic from older versions, and then re-allocate
   * it to the currently-deploying version(s)
   */
const getNewAllocations = versionIds => decAllocations => {
	// create 'integer percentage allocations' to make the math easier for JS
	const intAllocations = formatAllocationsToInt(decAllocations);
	const versionsServingTraffic = Object.keys(intAllocations);
	const currentTraffic = versionIds.reduce(
		(total, id) => total + (intAllocations[id] || 0),
		0
	);
	if (currentTraffic >= config.targetTraffic) {
		throw new Error(
			`Current traffic matches target ${config.targetTraffic}%`
		);
	}
	const increment = Math.min(
		config.incrementPercentage,
		config.targetTraffic - currentTraffic
	);

	let trafficUnallocated = 0;
	const reducedAllocations = versionsServingTraffic
		.filter(id => !versionIds.includes(id)) // non-deploying versions
		.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) // sorted to put earlier version numbers first
		.reduce((reduced, id) => {
			// take traffic from oldest versions as quickly as possible
			// use Math.round to avoid floating point inaccuracies, which are not
			// allowed in 'allocation' values sent to Google API.
			const deAllocation = Math.min(
				intAllocations[id],
				increment - trafficUnallocated
			);
			reduced[id] = intAllocations[id] - deAllocation;
			trafficUnallocated = trafficUnallocated + deAllocation;
			return reduced;
		}, {});

	// evenly distribute the unallocated traffic to deploying versions
	const increaseIncrement = Math.floor(
		trafficUnallocated / versionIds.length
	);
	const increasedAllocations = versionIds.reduce((increased, id, index) => {
		const currentAllocation = intAllocations[id] || 0;
		const allocationIncrease =
			index === versionIds.length - 1 // the last item gets all remaining unallocated
				? trafficUnallocated
				: increaseIncrement;
		increased[id] = currentAllocation + allocationIncrease;
		trafficUnallocated = trafficUnallocated - allocationIncrease;
		return increased;
	}, {});

	const newAllocations = Object.assign(
		{},
		increasedAllocations,
		reducedAllocations
	);

	logAllocations(intAllocations, newAllocations);
	// don't send zero-traffic items, set everything to decimal
	return formatAllocationsToDecimal(newAllocations);
};

const migrate = ({ auth, appsId, config }) => {
	const doMigrate = () =>
		checkForNewerVersion({ auth, appsId, config })
			.then(getSplit({ auth, appsId }))
			.then(getNewAllocations(config.versionIds))
			.then(newAllocations =>
				api.services
					.patch({
						auth,
						appsId,
						servicesId: config.servicesId,
						updateMask: 'split',
						resource: {
							split: {
								shardBy: 'RANDOM',
								allocations: newAllocations,
							},
						},
					})
					.then(checkOperation({ auth, appsId }))
					.then(() => {
						const versionTraffic = config.versionIds.reduce(
							(total, id) => total + newAllocations[id] * 100,
							0
						);
						if (versionTraffic >= config.targetTraffic) {
							return undefined;
						}
						console.log(
							chalk.gray(
								`waiting ${config.incrementWait / 1000}sec...`
							)
						);
						return new Promise(resolve => {
							setTimeout(
								() => resolve(doMigrate()),
								config.incrementWait
							);
						});
					})
			);

	return doMigrate;
};

/*
   * Operations on versions (e.g. deploying, starting) have some specific 'status'
   * info that is useful to log - this is just a wrapper around the basic
   * 'checkOperation' function
   */
const checkVersionOperation = ({ auth, appsId }) => op =>
	checkOperation({ auth, appsId })(op).then(version =>
		api.versions
			.get({
				auth,
				appsId,
				versionsId: version.id,
				servicesId: config.servicesId,
			})
			.then(v => {
				console.log(INDENT, 'serving status:', v.servingStatus);
				return v;
			})
	);

const createDeployment = ({ auth, appsId, config }) => () => {
	console.log(
		`Creating ${config.version} deployment: versions ${config.versionIds.join(
			', '
		)}`
	);
	return checkForNewerVersion({ auth, appsId, config }).then(() =>
		Promise.all(
			config.versionIds.map(id =>
				api.versions
					.create({
						auth,
						appsId,
						servicesId: config.servicesId,
						resource: createVersionSpec({ appsId, id, config }),
					})
					.then(op => {
						console.log(
							chalk.green(
								`Creating version ${id} for ${op.metadata
									.user}\n`
							),
							chalk.yellow(`Operation ${op.name} in progress`)
						);
						return op;
					})
					.then(checkVersionOperation({ auth, appsId }))
			)
		)
	);
};

const startVersions = ({ auth, appsId }) => versions =>
	Promise.all(
		versions.map(({ id }) =>
			api.versions
				.patch({
					auth,
					appsId,
					servicesId: config.servicesId,
					versionsId: id,
					updateMask: 'servingStatus',
					resource: { servingStatus: 'SERVING' },
				})
				.then(op => {
					console.log(
						chalk.green(
							`Starting version ${id} for ${op.metadata.user}\n`
						),
						chalk.yellow(`Operation ${op.name} in progress`)
					);
					return op;
				})
				.then(checkVersionOperation({ auth, appsId }))
		)
	);

module.exports = {
	command: 'deploy',
	description: 'deploy the current application to production',
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
				default: 2,
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
		}),
	handler: argv => {
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
		}).map((_, i) => `${version}-${i}`);

		const config = Object.assign({ envVariables, versionIds }, argv);

		return google.auth.getApplicationDefault((err, auth, appsId) => {
			if (err) {
				throw err;
			}
			if (auth.createScopedRequired && auth.createScopedRequired()) {
				auth = auth.createScoped([
					'https://www.googleapis.com/auth/appengine.admin',
					'https://www.googleapis.com/auth/cloud-platform',
				]);
			}
			console.log(chalk.blue(`Deploying version ${config.version}`));
			const runE2EWithRetry = id => runE2E(id).catch(() => runE2E(id));
			return checkForQuota({ auth, appsId, config })
				.then(createDeployment({ auth, appsId, config }))
				.then(startVersions({ auth, appsId }))
				.then(() => Promise.all(config.versionIds.map(runE2EWithRetry)))
				.then(migrate({ auth, appsId, config }))
				.catch(error => {
					console.log(chalk.red(`Stopping deployment: ${error}`));
					process.exit(1);
				});
		});
	},
};
