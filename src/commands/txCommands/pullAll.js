const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./util');
const txPullResource = require('./util/pullResourceTrns');

const getProjectResourcesList$ =
	txlib.resources$
		.flatMap(Rx.Observable.from);


const getIndividualResource = (resources, iteration) =>
	txPullResource.pullResourceContent$(resources[iteration]).subscribe(null, null, () => {
		console.log(`${resources[iteration]} done`);
		if (iteration+1 < resources.length) {
			getIndividualResource(resources, iteration+1);
		}
	});

const getResourceTrns = resources =>
	getIndividualResource(resources, 0);

module.exports = {
	command: 'pullAll',
	description: 'pulls all content for resources in from transifex in update date order',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('pulls all content for resources in from transifex in update date order'));

		getProjectResourcesList$
			.reduce((resources, resource) => [ ...resources, resource ], [])
			.subscribe(getResourceTrns);
	},
};
