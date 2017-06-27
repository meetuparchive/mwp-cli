const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const { allLocalPoTrnsWithFallbacks$, localTrns$ } = require('../txCommands/lib');
const localeCodes = require('./config/locales');

const MODULES_PATH = path.resolve('./src/trns/modules/');

const writeTrnModules = messagesByLocale => ({ filename, msgids }) => {
	localeCodes.forEach(localeCode => {
		if (!messagesByLocale[localeCode]) {
			messagesByLocale[localeCode] = {};
		}
		// create object of trns for current localeCode
		const trnsForLocale = msgids.reduce((trns, msgid) => {
			trns[msgid] = messagesByLocale[localeCode][msgid];
			return trns;
		}, {});
		// write the object to a file
		const relPath = path.relative('./src/', filename);
		const destFilename = path.resolve(
			MODULES_PATH,
			localeCode,
			`${relPath}.json`
		);
		const destDirname = path.dirname(destFilename);
		mkdirp.sync(destDirname);
		fs.writeFileSync(
			destFilename,
			`${JSON.stringify(trnsForLocale, null, 2)}\n`
		);
	});
};

const componentTrnDefinitions$ = localTrns$.map(trnsFromFile => ({
	filename: path.resolve(`./${trnsFromFile[0].file.replace(/\.jsx?$/, '')}`),
	msgids: trnsFromFile.map(({ id }) => id),
}));

/**
 * Write JSON modules for each component that defines TRN messages. Missing
 * translations will result in an empty JSON object
 *
 * @param {Array} localeCodes the array of supported locale code strings
 * @return {Observable} an observable that emits a single array of the
 *   react-intl babel plugin output for each component that calls `defineMessages`
 */
const buildTrnModules = localeCodes =>
	allLocalPoTrnsWithFallbacks$.mergeMap(
		messagesByLocale =>
			componentTrnDefinitions$.do(writeTrnModules(messagesByLocale)) // loop over components that define TRNs // write the files
	);

function main() {
	console.log('Cleaning TRN modules directory');
	child_process.execSync(`rm -rf ${MODULES_PATH}`);

	console.log('Transpiling TRN source to JSON');
	buildTrnModules(localeCodes).toPromise().catch(err => console.error(err));
}

module.exports = {
	command: 'trn',
	description: 'build the trn modules',
	handler: main,
};
