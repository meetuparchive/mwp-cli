const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./lib');

const updateMasterContent$ = txlib.localTrnsMerged$
	.flatMap(poContent =>
		txlib.updateResource$(
			txlib.MASTER_RESOURCE,
			poContent,
			txlib.PROJECT_MASTER
		)
	) // update master resource
	.map(updateResult => [txlib.MASTER_RESOURCE, updateResult]); // append 'master' for logging

const updateTranslations$ = txlib.allLocalPoTrns$
	.flatMap(txlib.uploadTrnsMaster$)
	.do(console.log);

	
module.exports = {
	command: 'pushTxMaster',
	description: 'push content to transifex master',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(
			chalk.blue('pushing content to transifex master')
		);

		Rx.Observable
			.concat(updateMasterContent$, updateTranslations$) // update master content before pushing translations
			.subscribe(null, null, () => console.log('done'));
	},
};
