const chalk = require('chalk');
const { pullResourceContent } = require('./util');

module.exports = {
	command: 'pull',
	description: 'pull resource content from transifex',
	builder: yarg =>
		yarg.option({
			resource: {
				alias: 'r',
				demandOption: true,
				type: 'array',
			},
		}),
	handler: argv => {
		console.log(chalk.blue('Pulling resource content from transifex'));

		argv.resource.forEach(resource =>
			pullResourceContent(resource).then(() =>
				console.log(chalk.green(`\n${resource} done`))
			)
		);
	},
};
