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

	// in dev, we want to build a single module containing all locales
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
	// otherwise, write a single module-per-locale
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

// Function for importing Flatpickr (fp) locale data for a particular 2-character
// language code code - see https://flatpickr.js.org/localization/
const fpLocale = lang => {
	const langFile = require(require.resolve(`flatpickr/dist/l10n/${lang}`, {
		paths: [paths.repoRoot],
	}));
	if (!langFile)
		console.error(
			`Flatpickr locale data for language ${lang} cannot be returned`
		);
	return langFile;
};

const PICKER_LOCALES = {
	'en-US': undefined, // default
	'en-AU': undefined, // default
	'de-DE': fpLocale('de'),
	es: fpLocale('es'),
	'es-ES': fpLocale('es'),
	'fr-FR': fpLocale('fr'),
	'it-IT': fpLocale('it'),
	'ja-JP': fpLocale('ja'),
	'ko-KR': fpLocale('ko'),
	'nl-NL': fpLocale('nl'),
	'pt-BR': fpLocale('pt'),
	'pl-PL': fpLocale('pl'),
	'ru-RU': fpLocale('ru'),
	'th-TH': fpLocale('th'),
	'tr-TR': fpLocale('tr'),
};
const buildDateLocales = () => {
	// in dev, we want to build a single module containing all locales
	if (
		packageConfig.combineLanguages ||
		process.env.NODE_ENV !== 'production'
	) {
		const destFilename = path.resolve(
			MODULES_PATH,
			'combined',
			'date',
			'pickerLocale.json'
		);
		mkdirp.sync(path.dirname(destFilename));
		return writeFile(destFilename, JSON.stringify(PICKER_LOCALES));
	}

	// otherwise, write a single module-per-locale
	return Promise.all(
		locales.map(localeCode => {
			const destFilename = path.resolve(
				MODULES_PATH,
				localeCode,
				'date',
				'pickerLocale.json'
			);
			mkdirp.sync(path.dirname(destFilename));
			return writeFile(
				destFilename,
				JSON.stringify({ [localeCode]: PICKER_LOCALES[localeCode] })
			).then(() => console.log('Wrote', destFilename));
		})
	);
};

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

	console.log('Writing locale data modules for datepicker');
	buildDateLocales()
		.then(() => {
			console.log('Transpiling TRN source to JSON...');
			return buildTrnModules().toPromise();
		})
		.then(
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
