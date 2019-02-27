const txlib = require('./util');
const chalk = require('chalk');

module.exports = {
	command: 'keys',
	description: 'Get list of resources and their keys',
	handler: argv => {
		console.log(chalk.blue('Downloading resource data\n'));

		return txlib.getTfxResources().then(resources =>
			Promise.all(
				resources.map(resource =>
					txlib
						.readResource(resource)
						.then(txlib.poStringToPoObj)
						.then(Object.keys)
						.then(keys => {
							console.log(resource);
							keys.forEach(key => console.log(`\t${key}`));
						})
				)
			)
		);
	},
};
