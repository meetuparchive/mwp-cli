const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./util');

module.exports = {
	command: 'pushTxMaster',
	description: 'push content to transifex master',
	handler: argv => {
		txlib.checkEnvVars();
		console.log(chalk.blue('pushing content to transifex master'));

		Rx.Observable
			.concat(txlib.updateMasterContent$, txlib.updateTranslations$) // update master content before pushing translations
			.subscribe(null, null, () => console.log('done'));
	},
};
