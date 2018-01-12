const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./index');

// push content to transifex master
const pushTxMaster = () => {
	txlib.checkEnvVars();
	console.log(chalk.blue('pushing content to transifex master'));

	Rx.Observable
		.concat(txlib.updateMasterContent$, txlib.updateTranslations$) // update master content before pushing translations
		.subscribe(null, null, () => console.log('done'));
};
module.exports = pushTxMaster;
