const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./util');

const pushTxAllTranslations = () => {
  txlib.checkEnvVars();
  console.log(chalk.blue('pushing content to all_translations in mup-web'));
  Rx.Observable
    .concat(txlib.updateAllTranslationsResource$)
    .subscribe(null, null, () => console.log('done'));
};
module.exports = { pushTxAllTranslations };
