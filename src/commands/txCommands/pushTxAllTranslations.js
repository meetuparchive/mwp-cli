const chalk = require('chalk');
const Rx = require('rxjs');
const txlib = require('./util');

module.exports = {
  command: 'pushTxAllTranslations',
  description: 'push content to transifex all_translations resource in mup-web',
  handler: argv => {
    txlib.checkEnvVars();
    console.log(chalk.blue('pushing content to all_translations in mup-web'));

    Rx.Observable
      .concat(txlib.updateAllTranslationsResource$)
      .subscribe((data) => console.log(data), (data) => console.log(data.params), () => console.log('done'));
  },
};
