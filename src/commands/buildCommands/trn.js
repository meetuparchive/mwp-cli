const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const { paths, locales } = require('mwp-config');
const {
	allLocalPoTrnsWithFallbacks$,
	localTrns$,
} = require('../txCommands/util');

const MODULES_PATH = path.resolve(paths.repoRoot, 'src/trns/modules/');

const writeTrnModules = messagesByLocale => ({ filename, msgids }) => {
	const trns = locales.reduce((acc, localeCode) => {
		if (!messagesByLocale[localeCode]) {
			messagesByLocale[localeCode] = {};
		}
		// create object of trns for current localeCode
		acc[localeCode] = msgids.reduce((trns, msgid) => {
			trns[msgid] = messagesByLocale[localeCode][msgid];
			return trns;
		}, {});
		return acc;
	}, {});
	console.log(JSON.stringify(trns, null, 2));

	const relPath = path.relative(paths.srcPath, filename);
	const destFilename = path.resolve(MODULES_PATH, `${relPath}.json`);
	const destDirname = path.dirname(destFilename);
	mkdirp.sync(destDirname);
	fs.writeFileSync(destFilename, `${JSON.stringify(trns, null, 2)}\n`);
};

const componentTrnDefinitions$ = localTrns$.map(trnsFromFile => ({
	filename: path.resolve(
		paths.repoRoot,
		trnsFromFile[0].file.replace(/\.jsx?$/, '')
	),
	msgids: trnsFromFile.map(({ id }) => id),
}));

/**
 * Write JSON modules for each component that defines TRN messages. Missing
 * translations will result in an empty JSON object
 *
 * @param {Array} locales the array of supported locale code strings
 * @return {Observable} an observable that emits a single array of the
 *   react-intl babel plugin output for each component that calls `defineMessages`
 */
const buildTrnModules = () =>
	allLocalPoTrnsWithFallbacks$.mergeMap(
		messagesByLocale =>
			componentTrnDefinitions$.do(writeTrnModules(messagesByLocale)) // loop over components that define TRNs // write the files
	);

function main() {
	console.log('Cleaning TRN modules directory');
	child_process.execSync(`rm -rf ${MODULES_PATH}`);

	console.log('Transpiling TRN source to JSON');
	buildTrnModules().toPromise().catch(err => console.error(err));
}

module.exports = {
	command: 'trn',
	description: 'build the trn modules',
	handler: main,
};
