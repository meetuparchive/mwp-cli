const chalk = require('chalk');
const child_process = require('child_process');

/**
 * Creates git commit of what has been staged
 * @param  {String} commitMessage what commit message to commit
 * @param  {String} args additional args to include with commit
 * @return {Observable} Observable of tx process
 */
const commit = (commitMessage, args) => {
	console.log('Committing local changes...');
	const stdout = child_process.execSync('git status');
	if (!stdout.includes('modified:')) {
		console.log(chalk.grey('no changes to commit'));
		return;
	}

	child_process.execSync('git add .');
	const command = `git commit -m ${JSON.stringify(commitMessage)} ${args}`;
	console.log(chalk.grey(command));
	child_process.execSync(command);
	console.log('Done.');
	return;
};

const devGitBranch = () => {
	return child_process
		.execSync('git rev-parse --abbrev-ref HEAD')
		.toString()
		.trim();
};

// Branch whether in dev or CI. Replaces forward slashes because
// branch names are used as transifex resource names and resource
// names need to work as valid url paths
const gitBranch = () => {
	const branchName = process.env.TRAVIS_PULL_REQUEST_BRANCH || devGitBranch();
	return branchName.replace(/\//g, '_');
};

const exitOnMaster = () => {
	console.log('Confirming this command is not being run on "master"');
	const branchName = gitBranch();
	if (branchName === 'master') {
		console.log(
			'ERROR: Do not run this script on master.',
			'It will corrupt the master resource on Transifex.'
		);
		process.exit(0);
	}
};

module.exports = {
	commit,
	devGitBranch,
	gitBranch,
	exitOnMaster,
};
