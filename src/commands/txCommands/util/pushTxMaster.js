const chalk = require('chalk');
const txlib = require('./index');

// push content to transifex master
const pushTxMaster = () => {
	console.log(chalk.blue('Pushing content to transifex master'));

	return txlib
		.updateMasterContent() // update master content before pushing translations
		.then(txlib.updateTranslations)
		.catch(err => {
			console.error('Encountered error during upload:', err);
			process.exit(1);
		});
};

module.exports = pushTxMaster;
