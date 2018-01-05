const chalk = require('chalk');
const child_process = require('child_process');
const Rx = require('rxjs');
const txlib = require('./util');
const txPullResource = require('./util/pullResourceTrns');

const getProjectResourcesList$ =
	txlib.resources$
		.flatMap(Rx.Observable.from);


const getIndividualResource = (resources, iteration, commitOnComplete) => {
	console.log(chalk.blue(`Starting tx:pull for '${resources[iteration]}'`));
	txPullResource.pullResourceContent$(resources[iteration]).subscribe(null, null, () => {
		console.log(chalk.green(`Completed tx:pull for '${resources[iteration]}'`));

		const doNext = iteration+1 < resources.length;

		if (commitOnComplete) {
			child_process.exec('git status', (error, stdout, stderr) => {
				if (stdout.includes('nothing to commit') === false) {
					child_process.execSync('git add src/trns');
					child_process.exec(`git commit -m "tx:pull for ${resources[iteration].replace(/-/g, '_')}" --no-verify`, () => {
						doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
						console.log(chalk.green(`- commited changes for '${resources[iteration]}'`));
					});
				} else {
					console.log(chalk.yellow(`- no changes to commit for '${resources[iteration]}'`));
					doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
				}
			});
		} else {
			doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
		}
	});
};

const getResourceTrns = (resources, commitOnComplete) =>
	getIndividualResource(resources, 0, commitOnComplete);

module.exports = {
	command: 'pullAll',
	description: 'pulls all content for resources in from transifex in update date order',
	builder: yarg =>
		yarg.option({
			gitCommit: {
				alias: 'gh',
				default: false
			},
		}),
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('pulls all content for resources in from transifex in update date order'));

		getProjectResourcesList$
			.reduce((resources, resource) => [ ...resources, resource ], [])
			.subscribe(resources => getResourceTrns(resources, argv.gitCommit));
	},
};
