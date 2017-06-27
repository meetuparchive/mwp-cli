const path = require('path');
const chalk = require('chalk');

module.exports = {
	command: 'tx',
	description: 'transifex lifecycle integration commands',
	builder: yargs => yargs.commandDir('txCommands', { exclude: /test\.js$/} ).demandCommand(),
};
