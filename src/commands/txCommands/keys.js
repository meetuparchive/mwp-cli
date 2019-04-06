const chalk = require('chalk');
const tfx = require('./util/transifex');

module.exports = {
	command: 'keys',
	description: 'Get list of resource slugs and their keys',
	handler: argv => {
		console.log(chalk.blue('Downloading resource data'));

		return tfx.resource.list().then(slugs =>
			Promise.all(
				slugs.map(slug =>
					tfx.resource
						.pullAll(slug)
						.then(Object.keys)
						.then(keys => {
							console.log(slug);
							keys.forEach(key => console.log(`\t${key}`));
						})
				)
			)
		);
	},
};
