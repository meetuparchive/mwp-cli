const chalk = require('chalk');
const txlib = require('./util');
const pullResourceTrns = require('./util/pullResourceTrns');

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
		txlib.checkEnvVars();
		console.log(chalk.blue('pulling resource content from transifex'));

		argv.resource.forEach(resource =>
			pullResourceTrns.pullResourceContent$(resource).subscribe(null, null, () =>
				console.log(`${resource} done`)
			)
		);
	},
};
