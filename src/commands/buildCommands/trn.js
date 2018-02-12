const { promisify } = require('util');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mkdirp = require('mkdirp');

const { paths, locales, package: packageConfig } = require('mwp-config');
const {
	allLocalPoTrnsWithFallbacks$,
	localTrns$,
} = require('../txCommands/util');

const MODULES_PATH = path.resolve(paths.repoRoot, 'src/trns/modules/');

const writeFile = promisify(fs.writeFile);

const writeTrnFile = (destFilename, trns) => {
	const destDirname = path.dirname(destFilename);
	mkdirp.sync(destDirname);
	return writeFile(destFilename, `${JSON.stringify(trns, null, 2)}\n`);
};

const writeTrnModules = messagesByLocale => ({ filename, msgids }) => {
	// create a single `{ [localeCode]: messages }` map - this routine cleans
	// out unused metadata from `messagesByLocale`
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

	if (
		packageConfig.combineLanguages ||
		process.env.NODE_ENV !== 'production'
	) {
		// one trn file, all trns
		const relPath = path.relative(paths.srcPath, filename);
		const destFilename = path.resolve(
			MODULES_PATH,
			'combined',
			`${relPath}.json`
		);
		return writeTrnFile(destFilename, trns);
	}
	// one trn file per supported locale
	return Promise.all(
		locales.map(localeCode => {
			const langTrns = { [localeCode]: trns[localeCode] };
			const relPath = path.relative(paths.srcPath, filename);
			const destFilename = path.resolve(
				MODULES_PATH,
				localeCode,
				`${relPath}.json`
			);
			return writeTrnFile(destFilename, langTrns);
		})
	);
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
	allLocalPoTrnsWithFallbacks$.mergeMap(messagesByLocale =>
		componentTrnDefinitions$.do(writeTrnModules(messagesByLocale)).toArray()
	);

function main() {
	console.log('Cleaning TRN modules directory');
	child_process.execSync(`rm -rf ${MODULES_PATH}`);

	console.log('Transpiling TRN source to JSON...');
	buildTrnModules().toPromise().then(
		trnDefs => {
			console.log(
				chalk.green(
					`Wrote TRN modules for ${trnDefs.length} components`
				)
			);
		},
		err => {
			console.error(chalk.red('TRN module build failed'));
			console.error(chalk.red(err.toString()));
			process.exit(1);
		}
	);
}

module.exports = {
	command: 'trn',
	description: 'build the trn modules',
	handler: main,
};
