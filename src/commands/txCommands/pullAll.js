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

		// only do a git commit if this is requested by the user when starting tx pull
		if (commitOnComplete) {
			// do an initial check to see if there is actually something to commit
			child_process.exec('git status', (error, stdout, stderr) => {
				// if 'nothing to commit' is NOT in `stdout` make a new commit
				// with resource name in commit message
				if (stdout.includes('nothing to commit') === false) {
					child_process.execSync('git add src/trns');
					// note: adjusting resource name to prevent branch/resources what contain
					// jira tickets in name from causing tickets to move through workflow when
					// PR for tx pulls are made
					child_process.exec(`git commit -m "tx:pull for ${resources[iteration].replace(/-/g, '_')}" --no-verify`, () => {
						console.log(chalk.green(`- commited changes for '${resources[iteration]}'`));
						// start next tx:pull
						doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
					});
				}
				// when there is nothing to commit don't bother making commit entry and just
				// message user with warning that no changes detected
				else {
					console.log(chalk.yellow(`- no changes to commit for '${resources[iteration]}'`));

					// start next tx:pull
					doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
				}
			});
		}

		else {
			doNext && getIndividualResource(resources, iteration+1, commitOnComplete);
		}
	});
};

const getResourceTrns = (resources, commitOnComplete) =>
	getIndividualResource(resources, 0, commitOnComplete);

module.exports = {
	command: 'pullAll',
	description: 'pulls all content for resources in from transifex in update date order. use --gh to create git commit after reach pull',
	builder: yarg =>
		yarg.option({
			gitCommit: {
				alias: 'gh',
				default: false
			},
		}),
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.cyan('Start pulling all trns for all resources in project'));

		getProjectResourcesList$
			.reduce((resources, resource) => [ ...resources, resource ], [])
			.subscribe(resources => getResourceTrns(resources, argv.gitCommit));
	},
};
