const GitHubApi = require('github');
const chalk = require('chalk');
const github = GitHubApi();

module.exports = {
	command: 'status',
	description: 'Set a PR status',
	builder: yarg =>
		yarg
			.options({
				value: {
					alias: 's', // s for 'status'. -v is conventionally a 'version' alias
					demandOption: true,
					type: 'string',
					describe: 'The status value',
					choices: ['pending', 'failure', 'error', 'success'],
				},
				commit: {
					alias: 'c',
					demandOption: true,
					type: 'string',
				},
				token: {
					alias: 't',
					type: 'string',
				},
				repo: {
					alias: 'r',
					demandOption: true,
					type: 'string',
				},
				context: {
					demandOption: true,
					type: 'string',
				},
				description: {
					alias: 'd',
					type: 'string',
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
	handler: ({ value, commit, token, repo, context, description }) => {
		github.authenticate({
			type: 'token',
			token,
		});
		github.repos
			.createStatus({
				owner: 'meetup',
				repo,
				sha: commit,
				state: value,
				description,
				context,
			})
			.then(
				resp => console.log(chalk.green(`PR status: ${value}`)),
				err => console.error(chalk.red(`Failed to set PR status to ${value}`))
			);
	},
};
