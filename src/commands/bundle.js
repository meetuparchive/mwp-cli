module.exports = {
	command: 'bundle',
	description: 'build application rendering bundle(s) for a monorepo',
	builder: yargs => yargs.commandDir('bundleCommands').demandCommand(),
};
