const chalk = require('chalk');
const txlib = require('./index');

const pushTxAllTranslations = () => {
  txlib.checkEnvVars();
  console.log(chalk.blue('pushing content to all_translations in mup-web'));
  txlib.updateAllTranslationsResource$
    .subscribe(
        null,
        (error) => console.error(`encountered error during upload: ${error}`),
        () => console.log('done')
    );
};
module.exports = pushTxAllTranslations;
