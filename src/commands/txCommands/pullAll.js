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
 * @return {Observable} Observable of shell process
 */
const commitResource$ = (resource) => {
	const commitCommand = `git commit -m "tx:pull for ${resource.replace(/-/g, '_')}" --no-verify`;
	return child_process$(commitCommand)
		.do(() => {
			console.log(chalk.green(commitCommand));
		});
};

/**
 * Called when a tx pull is complete for a particular resource
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {Boolean} commitOnComplete flag used to determine if we should commit the resource in git
 * @return {Observable} Observable of tx process
 */
const onPullResourceComplete = (resource, commitOnComplete) => {
	if (!commitOnComplete) {
		return Rx.Observable.empty();
	}

	return child_process$('git status')
		.flatMap(([stdout, stderr]) => {
			if (stdout.includes('modified:')) {
				child_process.execSync('git add src/trns');
				return commitResource$(resource);
			}

			console.log(chalk.grey(`no changes to commit for '${resource}'`));
			return Rx.Observable.empty();
		});
};

/**
 * Kicks off process to pull an individual resources trns
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {Boolean} commitOnComplete flag used to determine if we should commit the resource in git
 * @return {Observable} Observable of tx process
 */
const pullResource = (resource, commitOnComplete) => {
	console.log(chalk.cyan(`Starting tx:pull for '${resource}'`));
	return pullResourceTrns.pullResourceContent$(resource)
		.toArray()
		.do(() => console.log(chalk.green(`\nCompleted tx:pull for '${resource}'`)))
		.flatMap(() => onPullResourceComplete(resource, commitOnComplete));
};

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
			.subscribe(null, (error) => console.error(error), () => console.log(chalk.green('All resources pulled.')));
	},
};
