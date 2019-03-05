const chalk = require('chalk');
const tfx = require('./util/transifex');

module.exports = {
	command: 'keys',
	description: 'Get list of resources and their keys',
	handler: argv => {
		console.log(chalk.blue('Downloading resource data'));

		return tfx.resource.list().then(resources =>
			Promise.all(
				resources.map(resource =>
					tfx.resource
						.pullAll(resource)
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
