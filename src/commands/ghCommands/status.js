const GitHubApi = require('github');
const chalk = require('chalk');
const github = GitHubApi();

module.exports = {
	command: 'status',
	description:
		'Set a PR status - https://developer.github.com/v3/repos/statuses/',
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
					describe: 'repo name/slug',
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
			})
			.check((argv, opts) => {
				if (argv.commit.length < 40) {
					throw new Error(
						`Full 40-character SHA-1 value must be provided - recieved ${argv.commit}`
					);
				}
				return true;
			}),
	handler: ({ state, commit, token, repo, context, description }) => {
		github.authenticate({
			type: 'token',
			token,
		});
		github.repos
			.createStatus({
				owner: 'meetup',
				repo,
				sha: commit,
				state,
				description,
				context,
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
