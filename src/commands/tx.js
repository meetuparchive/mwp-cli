module.exports = {
	command: 'tx',
	description: 'transifex lifecycle integration commands',
	builder: yargs => yargs.commandDir('txCommands').demandCommand(),
};
