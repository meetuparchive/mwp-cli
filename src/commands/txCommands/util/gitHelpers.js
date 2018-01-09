const chalk = require('chalk');
const child_process = require('child_process');
const Rx = require('rxjs');

const child_process$ = Rx.Observable.bindNodeCallback(child_process.exec);

/**
 * Creates git commit of what has been staged
 * @param  {String} resource resource slug to be used when we pull translations
 * @param  {String} commitMessage what commit message to commit
 * @return {Observable} Observable of tx process
 */
const commit$ = (resource, commitMessage) => {
	return child_process$('git status')
		.flatMap(([stdout, stderr]) => {
			if (!stdout.includes('modified:')) {
				console.log(chalk.grey('no changes to commit'));
				return Rx.Observable.empty();
			}

			child_process.execSync('git add .');
			return child_process$(commitMessage)
			.do(() => {
				console.log(chalk.green(commitMessage));
			});
		});
};

module.exports = {
	commit$
};
