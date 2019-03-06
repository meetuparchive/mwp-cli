const tfx = require('./util/transifex');
const chalk = require('chalk');

module.exports = {
	command: 'status',
	description: 'get translation status of resources (branches)',
	handler: argv => {
		console.log(chalk.blue('checking resource status'));

		tfx.resource
			.listIncomplete()
			.then(resources => {
				if (resources.length) {
					console.log('\nIncomplete Resources');
					resources.forEach(([branchName, percentage]) =>
						console.log(branchName, percentage)
					);
				}
			})
			.then(tfx.resource.listComplete)
			.then(resources => {
				if (resources.length) {
					console.log('\nComplete Resources');
					resources.forEach(console.log);
				}
			});
	},
};
