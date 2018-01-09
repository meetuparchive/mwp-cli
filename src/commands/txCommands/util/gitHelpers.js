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

module.exports = {
	commit$
};
