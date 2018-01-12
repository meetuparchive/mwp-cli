const chalk = require('chalk');
const child_process = require('child_process');
const Rx = require('rxjs');
const child_process$ = Rx.Observable.bindNodeCallback(child_process.exec);

/**
 * Creates git commit of what has been staged
 * @param  {String} commitMessage what commit message to commit
 * @param  {String} args additional args to include with commit
 * @return {Observable} Observable of tx process
 */
const commit$ = (commitMessage, args) => {
	return child_process$('git status')
		.flatMap(([stdout, stderr]) => {
			if (!stdout.includes('modified:')) {
				console.log(chalk.grey('no changes to commit'));
				return Rx.Observable.empty();
			}

			child_process.execSync('git add .');
			const command = `git commit -m ${JSON.stringify(commitMessage)} ${args}`;
			return child_process$(command)
				.do(() => {
					console.log(chalk.green(command));
				});
		});
};

const devGitBranch$ = child_process$(
	'git rev-parse --abbrev-ref HEAD'
)
	.pluck(0)
	.map(str => str.slice(0, -1));

// Branch whether in dev or CI. Replaces forward slashes because
// branch names are used as transifex resource names and resource
// names need to work as valid url paths
const gitBranch$ = Rx.Observable
	.if(
		() => process.env.TRAVIS_PULL_REQUEST_BRANCH,
		Rx.Observable.of(process.env.TRAVIS_PULL_REQUEST_BRANCH),
		devGitBranch$
	)
	.map(branchname => branchname.replace(/\//g, '_'));

module.exports = {
	commit$,
	devGitBranch$,
	gitBranch$,
};
