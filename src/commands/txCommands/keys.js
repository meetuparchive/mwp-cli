const Rx = require('rxjs');
require('rxjs/add/observable/from');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/map');
require('rxjs/add/operator/do');
const txlib = require('./util');
const chalk = require('chalk');

module.exports = {
	command: 'keys',
	description: 'Get list of resources and their keys',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('Downloading resource data\n'));

		txlib.resources$
			.mergeMap(Rx.Observable.from)
			.mergeMap(resource =>
				txlib
					.readResource$(resource)
					.mergeMap(txlib.parsePluckTrns)
					.map(Object.keys)
					.map(keys => [resource, keys])
			)
			.do(([resource, keys]) => {
				console.log(resource);
				keys.forEach(key => console.log(`\t${key}`));
			})
			.subscribe();
	},
};
