const GitHubApi = require('@octokit/rest');
const chalk = require('chalk');
const github = GitHubApi();

module.exports = {
	command: 'status',
	description: 'Set a PR status - https://developer.github.com/v3/repos/statuses/',
	builder: yarg =>
		yarg
			.options({
				state: {
					alias: 's',
					demandOption: true,
					describe: 'The status value/state',
					choices: ['pending', 'failure', 'error', 'success'],
				},
				commit: {
					alias: 'c',
					demandOption: true,
					describe: 'Full SHA-1 hash for PR commit',
				},
				token: {
					alias: 't',
					demandOption: true,
					describe: 'GitHub user API token with `repo:status` permission',
				},
				repo: {
					alias: 'r',
					demandOption: true,
					describe: 'repo slug in the form :owner/:repo',
				},
				context: {
					demandOption: true,
					describe:
						'A string label to differentiate this status from the status of other systems',
				},
				description: {
					alias: 'd',
					describe: 'A short description of the status',
				},
				target: {
					describe: 'target URL to find out more details',
				},
			})
			.check((argv, opts) => {
				if (argv.commit.length < 40) {
					throw new Error(
						`Full 40-character SHA-1 value must be provided - recieved ${argv.commit}`
					);
				}
				if (argv.repo.split('/').length !== 2) {
					console.warn(
						chalk.yellow(
							`'repo' should be in the form :owner/:repo - received ${argv.repo}`
						)
					);
				}
				return true;
			}),
	handler: ({ state, commit, token, repo, context, description, target }) => {
		github.authenticate({
			type: 'token',
			token,
		});
		let [owner, repoName] = repo.split('/');
		if (!repoName) {
			// assume that just the repoName was supplied, owner is meetup
			repoName = owner;
			owner = 'meetup';
		}
		github.repos
			.createStatus({
				owner,
				repo: repoName,
				sha: commit,
				state,
				description,
				context,
				target_url: target,
			})
			.then(
				resp => console.log(chalk.green(`PR status: ${state}`)),
				err => {
					console.error(
						chalk.red('ERROR:'),
						`GH status not set: ${JSON.parse(err.message).message}`
					);
					console.error(chalk.red(`Failed to set PR status to ${state}`));
				}
			);
	},
};
