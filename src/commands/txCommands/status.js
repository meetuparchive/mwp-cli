const txlib = require('./util');
const chalk = require('chalk');

module.exports = {
	command: 'status',
	description: 'get translation status of resources (branches)',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('checking resource status'));

		txlib.resourcesIncomplete$
			.toArray()
			.do(resources => {
				if (resources.length) {
					console.log('\nIncomplete Resources');
					resources.forEach(([branchName, percentage]) => console.log(branchName, percentage));
				}
			})
			.flatMap(() => txlib.resourcesComplete$)
			.toArray()
			.do(resources => {
				if (resources.length) {
					console.log('\nComplete Resources');
					resources.forEach(console.log);
				}
			})
			.subscribe();
	},
};