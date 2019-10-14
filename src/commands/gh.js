module.exports = {
	command: 'gh',
	description: 'GitHub API interface',
	builder: yargs =>
		yargs
			.env('GITHUB')
			.commandDir('ghCommands')
			.demandCommand(),
};
