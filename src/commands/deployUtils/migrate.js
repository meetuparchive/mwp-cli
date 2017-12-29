const chalk = require('chalk');
const cloudApi = require('./cloudApi');

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

module.exports = (config, { allocations, operations, versions }) => {
	const {
		auth,
		appsId,
		targetTraffic,
		incrementPercentage,
		versionIds,
		servicesId,
		incrementWait,
	} = config;
	const getNewAllocations = versionIds => decAllocations => {
		// create 'integer percentage allocations' to make the math easier for JS
		const intAllocations = formatAllocationsToInt(decAllocations);
		const versionsServingTraffic = Object.keys(intAllocations);
		const currentTraffic = versionIds.reduce(
			(total, id) => total + (intAllocations[id] || 0),
			0
		);
		if (currentTraffic >= targetTraffic) {
			throw new Error(`Current traffic matches target ${targetTraffic}%`);
		}
		const increment = Math.min(
			incrementPercentage,
			targetTraffic - currentTraffic
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
		const increasedAllocations = versionIds.reduce(
			(increased, id, index) => {
				const currentAllocation = intAllocations[id] || 0;
				const allocationIncrease =
					index === versionIds.length - 1 // the last item gets all remaining unallocated
						? trafficUnallocated
						: increaseIncrement;
				increased[id] = currentAllocation + allocationIncrease;
				trafficUnallocated = trafficUnallocated - allocationIncrease;
				return increased;
			},
			{}
		);

		const newAllocations = Object.assign(
			{},
			increasedAllocations,
			reducedAllocations
		);

		logAllocations(intAllocations, newAllocations);
		// don't send zero-traffic items, set everything to decimal
		return formatAllocationsToDecimal(newAllocations);
	};

	const doMigrate = () =>
		versions.validate
			.noNewer()
			.then(allocations)
			.then(getNewAllocations(versionIds))
			.then(newAllocations =>
				cloudApi.services
					.patch({
						auth,
						appsId,
						servicesId,
						updateMask: 'split',
						resource: {
							split: {
								shardBy: 'RANDOM',
								allocations: newAllocations,
							},
						},
					})
					.then(operations.track)
					.then(() => {
						const versionTraffic = versionIds.reduce(
							(total, id) => total + newAllocations[id] * 100,
							0
						);
						if (versionTraffic >= targetTraffic) {
							return undefined;
						}
						console.log(
							chalk.gray(`waiting ${incrementWait / 1000}sec...`)
						);
						return new Promise(resolve => {
							setTimeout(
								() => resolve(doMigrate()),
								incrementWait
							);
						});
					})
			);

	return doMigrate;
};
