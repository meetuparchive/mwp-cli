const chalk = require('chalk');
const txlib = require('./index');

const pushTxAllTranslations = () => {
	console.log(chalk.blue('pushing content to all_translations in mup-web'));
	txlib.updateTfxSrcAllTranslations().catch(error => {
		console.error(`encountered error during upload: ${error}`);
		process.exit(1);
	});
};
module.exports = pushTxAllTranslations;
