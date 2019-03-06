const fs = require('fs');
const path = require('path');

const babel = require('babel-core');
const glob = require('glob');
const memoize = require('memoize-one');
const { paths } = require('mwp-config');
const poFormatters = require('./poFormatters');
const tfx = require('./transifex');
const { logSuccess, logError } = require('./logger');

const PO_DIR = path.resolve(paths.repoRoot, 'src/trns/po/');

/**
 * This modules connects local file system content to the Transifex API,
 * providing logic to search for specific local content and merge it with
 * related remote content
 */

/* Utilities */

// Given an array of objects, merge them into a 'data' property, and keep track
// of duplicate keys in an 'errors' property
// Useful for finding duplicate keys across different files
// Array<{ key: { comments: { reference: filename } }, ... }> =>
//   { data: PoObj, errors: { string: Array<filename> }
const mergeUnique = ({ data, errors }, toMerge) => {
	Object.keys(toMerge).forEach(key => {
		if (data[key] === undefined) {
			data[key] = toMerge[key];
		} else if (errors[key]) {
			errors[key].push(toMerge[key].comments.reference);
		} else {
			errors[key] = [
				data[key].comments.reference,
				toMerge[key].comments.reference,
			];
		}
	});

	return { data, errors };
};

// takes array of local trns in po format, merges, and throws error if there
// are duplicate keys
// Array<PoTrn> => PoTrn
const reduceUniques = localTrns => {
	const { data, errors } = localTrns.reduce(mergeUnique, {
		data: {},
		errors: {},
	});
	if (Object.keys(errors).length > 0) {
		throw new Error(`dupe keys: ${JSON.stringify(errors, null, 2)}`);
	}

	return data;
};

/* END UTILITIES */

// extract trn source data from local application, one value per file-with-content
// () => Array<MessageDescriptor>
const extractTrnSource = () =>
	glob
		.sync(
			`${paths.repoRoot}/src/+(components|app)/**/!(*.test|*.story).jsx`
		)
		.map(file =>
			babel.transformFileSync(file, {
				plugins: [['react-intl', { extractSourceLocation: true }]],
			})
		)
		.map(
			babelOut =>
				((babelOut.metadata || {})['react-intl'] || {}).messages || []
		)
		.filter(trns => trns.length);

// () => Po
const getLocalTrnSourcePo = () =>
	reduceUniques(extractTrnSource().map(poFormatters.msgDescriptorsToPoObj));

const _fileToLocaleTuple = filename => {
	const lang_tag = path.basename(filename, '.po');
	const fileContent = fs.readFileSync(filename).toString();
	return [lang_tag, poFormatters.poStringToPoObj(fileContent)];
};
const getAllLocalPoContent = memoize(() =>
	glob.sync(`${PO_DIR}/!(en-US).po`).map(_fileToLocaleTuple)
);

// map of locale code to translated content formatted for React-Intl
const getLocalLocaleMessages = () => {
	const poContent = glob
		.sync(`${PO_DIR}/*.po`)
		// read and parse all po files
		.map(_fileToLocaleTuple)
		.reduce((obj, [lang_tag, poObj]) => {
			obj[lang_tag] = poFormatters.poObjToMsgObj(poObj);
			return obj;
		}, {});
	// assign es-ES fallbacks - extend base 'es' translations with
	// any existing 'es-ES'-specific translations into a new object
	poContent['es-ES'] = Object.assign({}, poContent['es'], poContent['es-ES']);
	return poContent;
};

/* *** END LOCAL FILE READING *** */

// returns keys which are not in main or have an updated value
const objDiff = ([main, extracted]) =>
	Object.keys(extracted)
		.filter(
			key => !main[key] || main[key].msgstr[0] != extracted[key].msgstr[0]
		)
		.reduce((obj, key) => {
			obj[key] = extracted[key];
			return obj;
		}, {});

// sometimes we want to compare against master, sometimes master plus existing resources
// master, content: Promise<PoObj>
const trnSrcDiffVerbose = (master, content) =>
	Promise.all([master, content])
		.then(([main, trns]) => {
			console.log(
				'reference trns',
				Object.keys(main).length,
				' / trns extracted:',
				Object.keys(trns).length
			);
			return objDiff([main, trns]);
		})
		.then(trnDiff => {
			console.log('trns added / updated:', Object.keys(trnDiff).length);
			return trnDiff;
		});

// Helper to update tx resource with all local trns
const updateAllSrc = (slug, project) => {
	const allPoContent = getLocalTrnSourcePo(); // from JSX, in PO format
	return tfx.resource
		.updateSrc(slug, allPoContent, project)
		.then(updateResult => [slug, updateResult])
		.then(
			logSuccess(`Update ${project}/${slug} success`),
			logError(`ERROR: update failed for ${project}/${slug}`)
		);
};

// convenience function for updating project's master resource
// _source_ data
const updateTfxSrcMaster = () => updateAllSrc(tfx.MASTER_RESOURCE);

// convenience function for updating project's all_translations resource
// _source_ data
const updateTfxSrcAllTranslations = () =>
	updateAllSrc(tfx.ALL_TRANSLATIONS_RESOURCE);

// Helper to update master with all local translated content
// TODO: unit test when tfx can be mocked
const updateTfxCopyMaster = () =>
	Promise.all(
		getAllLocalPoContent().map(([lang_tag, poObj]) => {
			return tfx.resource.updateCopy(
				[lang_tag, poFormatters.poObjToPoString(poObj)],
				tfx.MASTER_RESOURCE
			);
		})
	);

// Merge remote translated PO content into local content /src/trns directory
const pullResourceContent = (branch, poDir = PO_DIR) =>
	Promise.all(
		// 1. load local trn content [ lang_tag, content ]
		getAllLocalPoContent().map(([lang_tag, localContent]) =>
			// 2. download updates
			tfx.resource.pullLang(branch, lang_tag).then(remoteContent => {
				// 3. write po files with updates merged into existing localContent
				const poContent = poFormatters.poObjToPoString(
					Object.assign(localContent, remoteContent)
				);
				const filepath = path.resolve(poDir, `${lang_tag}.po`);
				fs.writeFileSync(filepath, poContent);
				process.stdout.write(`${lang_tag},`); // incrementally write one-line log
			})
		)
	).then(() => process.stdout.write('\n'));

module.exports = {
	getAllLocalPoContent,
	getLocalLocaleMessages,
	objDiff,
	trnSrcDiffVerbose,
	extractTrnSource,
	getLocalTrnSourcePo,
	pullResourceContent,
	reduceUniques,
	updateTfxSrcMaster,
	updateTfxSrcAllTranslations,
	updateTfxCopyMaster,
};
