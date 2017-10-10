const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./util');

// grab all trns
const updateMasterContent$ = txlib.localTrnsMerged$
	.flatMap(poContent =>
		txlib.updateResource$(
			txlib.MASTER_RESOURCE,
			poContent,
			txlib.PROJECT_MASTER
		).do(() => console.log('update master success'), () => console.log('update master FAIL!'))
	) // update master resource
	.map(updateResult => [txlib.MASTER_RESOURCE, updateResult]); // append 'master' for logging


module.exports = {
	command: 'pushTxMaster',
	description: 'push content to transifex master',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('pushing content to transifex master'));

		txlib.diffVerbose$(txlib.txMasterTrns$, txlib.localTrnsMerged$)
			.map(Object.keys)
			.do(keys => console.log(`\nNew / Updated Keys: \n${keys.join('\n')}`))
			// need to update master content _then_ push translations
			.flatMap(keys => updateMasterContent$
				.flatMap(() => txlib.uploadTranslationsForKeys$(keys))
			)
			.subscribe(() => console.log('done'));
	},
};
