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
				describe: 'slugs (names) for each resource to pull',
				type: 'array',
			},
		}),
	handler: argv => {
		console.log(chalk.blue('Pulling resource content from transifex'));

		argv.resource.forEach(slug =>
			pullResourceContent(slug).then(() =>
				console.log(chalk.green(`\n${slug} done`))
			)
		);
	},
};
