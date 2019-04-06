const chalk = require('chalk');
const txlib = require('./index');

// push content to transifex master
const pushTxMaster = () => {
	console.log(chalk.blue('Pushing content to transifex master'));

	return txlib
		.updateTfxSrcMaster() // update Master with all _input strings_
		.then(txlib.updateTfxCopyMaster) // update Master with all existing _translated strings_
		.catch(err => {
			process.exit(1);
		});
};

module.exports = pushTxMaster;
