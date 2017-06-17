module.exports = {
	command: 'build',
	description: 'build application rendering bundle(s)',
	builder: yargs => yargs.commandDir('buildCommands').demandCommand(),
};
