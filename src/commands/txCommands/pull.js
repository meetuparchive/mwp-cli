const chalk = require('chalk');
const { pullResourceContent } = require('./util');
const { version3 } = require('./util/constants');
const utilsV3 = require('./util/utilsV3');

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
			version3,
		}),
	handler: argv => {
		console.log(chalk.blue('Pulling resource content from transifex'));

		if (argv.v3) {
			console.log(chalk.magenta('Using Transifex v3'));
			argv.resource.forEach(slug =>
				utilsV3
					.pullResourceContent(slug)
					.then(() => console.log(chalk.green(`\n${slug} done`)))
			);

			return;
		}

		argv.resource.forEach(slug =>
			pullResourceContent(slug).then(() =>
				console.log(chalk.green(`\n${slug} done`))
			)
		);
	},
};
