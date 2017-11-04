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

const updateTranslations$ = txlib.allLocalPoTrns$
	.flatMap(([lang_tag, content]) =>
		txlib.wrapCompilePo$(content).map(content => [lang_tag, content]))
	.flatMap(txlib.uploadTrnsMaster$);

module.exports = {
	command: 'pushTxMaster',
	description: 'push content to transifex master',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('pushing content to transifex master'));

		Rx.Observable
			.concat(updateMasterContent$, updateTranslations$) // update master content before pushing translations
			.subscribe(null, null, () => console.log('done'));
	},
};
