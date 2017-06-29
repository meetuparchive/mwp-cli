const allLocales = require('../commands/buildCommands/config/locales');

const supportedLocales = process.env.NODE_ENV === 'production'
	? allLocales
	: allLocales.slice(0, 1); // default to top locale in dev

const addLocalesOption = yargs => yargs
    .array('locales')
    .option('locales', {
        default: supportedLocales,
        description: 'localeCodes to build the app for',
    });

module.exports = addLocalesOption;
