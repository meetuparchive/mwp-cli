const chalk = require('chalk');
const child_process = require('child_process');
const Rx = require('rxjs');
const txlib = require('./util');
const pullResourceTrns = require('./util/pullResourceTrns');

const getProjectResourcesList$ =
	txlib.resources$
		.flatMap(Rx.Observable.from);

const child_process$ = Rx.Observable.bindNodeCallback(child_process.exec);

/**
 * Creates git commit of what has been staged
 *
 * note: adjusting resource name in git commit message to prevent jira ticket
 * from moving through workflow. We have a script which looks at all git commits
 * to see if a ticket number is contained within it and if so associates a branch/PR
 * with it. We don't want that to happen with tx pulls.
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {Observable} observer Observable of resource pull
 * @return {Observable} Observable of shell process
 */
const commitResource = (resource, observer) =>
	child_process$(`git commit -m "tx:pull for ${resource.replace(/-/g, '_')}" --no-verify`)
		.flatMap(() => {
			console.log(chalk.green(`- commited changes for '${resource}'`));
			// start next tx:pull
			return observer.complete();
		});

/**
 * Called when a tx pull is complete for a particular resource
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {Observable} observer Observable of resource pull
 * @param  {Boolean} commitOnComplete flag used to determine if we should commit the resource in git
 * @return {undefined}
 */
const onPullResourceComplete = (resource, observer, commitOnComplete) => {
	console.log(chalk.green('done...', resource));
	if (!commitOnComplete) {
		console.log('here...');
		return observer.complete();
	}

	// stops here...
	console.log('or here....');

	child_process$('git status')
		.flatMap((error, stdout, stderr) => {
			console.log('stdout', stdout);
			if (stdout.includes('modified:')) {
				child_process.execSync('git add src/trns');
				return observer.complete();
				// commitResource(resource, observer);
			}
		});
};

/**
 * Kicks off process to pull an individual resources trns
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {Boolean} commitOnComplete flag used to determine if we should commit the resource in git
 * @return {Observable} Observable of tx process
 */
const pullResource = (resource, commitOnComplete) =>
	Rx.Observable.create(observer => {
		pullResourceTrns.pullResourceContent$(resource)
			.subscribe(null, null, () => onPullResourceComplete(resource, observer, commitOnComplete));
	});

module.exports = {
	command: 'pullAll',
	description: 'Pull all translations from resources from Transifex, ordered by most recently updated',
	builder: yarg =>
		yarg.option({
			gitCommit: {
				alias: 'c',
				default: false
			},
		}),
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.magenta('Start pulling all resources process...'));

		getProjectResourcesList$
			.flatMap(resource => pullResource(resource, argv.gitCommit), 1)
			.subscribe(null, null, () => console.log(chalk.green('All resources pulled.')));
	},
};
