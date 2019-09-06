module.exports = {
	command: 'build',
	description: 'DEPRECATED: legacy system to build application rendering bundle(s)',
	builder: yargs => yargs.commandDir('buildCommands').demandCommand(),
};
