const fs = require('fs');
const path = require('path');

const babel = require('babel-core');
const gettextParser = require('gettext-parser');
const glob = require('glob');
const memoize = require('memoize-one');
const { paths, localesSecondary } = require('mwp-config');
const { exitOnMaster } = require('./gitHelpers');
const tfx = require('./transifex');

const PROJECT = tfx.PROJECT;
const PROJECT_MASTER = `${PROJECT}-master`; // separate project so translators don't confuse with branch content
const MASTER_RESOURCE = 'master';
const ALL_TRANSLATIONS_RESOURCE = 'all_translations';
const PO_PATH = `${path.resolve(paths.repoRoot, 'src/trns/po/')}/`;

/**
 * type PoTrn = {
 *   string: {  // msgid
 *     msgid: string,
 *     msgstr: string,
 *     comments: {
 *       extracted: string,  // description.text
 *       translator: string, // description.jira
 *       reference: string,  // filename:start:end
 *     }
 *   }
 * }
 *
 * type MessageObj = {
 *   [id: string]: string
 * }
 *
 * type MessageMap = {
 *   [localeCode: string ]: MessageObj
 * }
 */

// helper for logging status while passing along results of async call
const logSuccess = (...messageArgs) => result => {
	console.log(...messageArgs);
	return result;
};

// helper for logging error status and re-throwing error
const logError = (...messageArgs) => err => {
	console.log(...messageArgs, err);
	throw err;
};

// promise-retrying function
const retry = (fn, retryCount) =>
	fn().catch(err => {
		if (!retryCount) {
			// no more retries - gotta throw
			throw err;
		}
		return retry(fn, retryCount - 1);
	});

// return object that is a map of trn keys/ids to translated copy - remove
// extraneous metadata from Po file content
// fileString => PoTrn
const poStringToPoObj = fileContent => {
	const poTrn = gettextParser.po.parse(fileContent).translations['']; // yes, a blank string as a key
	// translations object includes unusable empty string key - remove it
	delete poTrn[''];
	return Object.keys(poTrn).reduce((acc, key) => {
		if (poTrn[key].msgstr[0]) {
			// effectively filtering out empty trn content
			acc[key] = poTrn[key];
		}
		return acc;
	}, {});
};

// take a set of PoTrn and compile a po file contents string
const poObjToPoString = poObj => {
	const headerWrapped = {
		charset: 'utf-8',
		headers: {
			'content-type': 'text/plain; charset=utf-8',
		},
		translations: {
			'': poObj,
		},
	};
	return `${gettextParser.po.compile(headerWrapped).toString()}\n`;
};

// returns keys which are not in main or have an updated value
const diff = ([main, extracted]) =>
	Object.keys(extracted)
		.filter(
			key => !main[key] || main[key].msgstr[0] != extracted[key].msgstr[0]
		)
		.reduce((obj, key) => {
			obj[key] = extracted[key];
			return obj;
		}, {});

// Given an array of objects, merge them into a 'data' property, and keep track
// of duplicate keys in an 'errors' property
// Useful for finding duplicate keys across different files
// Array<{ key: { comments: { reference: filename } }, ... }> => { data: Object, errors: { string: Array<filename> }
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

// takes array of local trns in po format, merges, and throws error if there are duplicate keys
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

// Array<MessageDescriptor> => Po
const msgDescriptorsToPoObj = messages =>
	messages.reduce((acc, msg) => {
		if (typeof msg.description !== 'object' || !msg.description.jira) {
			throw new Error('Trn content missing jira story reference', msg);
		}

		acc[msg.id] = {
			msgid: msg.id,
			msgstr: [msg.defaultMessage],
			comments: {
				extracted: msg.description.text,
				translator: msg.description.jira,
				reference: `${msg.file}:${msg.start.line}:${msg.start.column}`,
			},
		};

		return acc;
	}, {});

// extract trn source data from application, one value per file-with-content
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
	reduceUniques(extractTrnSource().map(msgDescriptorsToPoObj));

// required fields for resource creation and updating. http://docs.transifex.com/api/resources/#post
const resourceContent = (slug, content) => ({
	slug,
	name: slug,
	i18n_type: 'PO',
	content,
});

const createTfxResource = (slug, content) => {
	const compiledContent = poObjToPoString(content);
	return tfx.api
		.resourceCreateMethod(PROJECT, resourceContent(slug, compiledContent))
		.then(
			logSuccess('create', slug),
			logError('Failed to create resource.', slug)
		);
};

const readTfxResource = (slug, project = PROJECT) =>
	retry(
		() =>
			tfx.api
				.sourceLanguageMethods(project, slug)
				.catch(logError(`error readTfxResource ${slug} ${project}`)),
		5
	);

const updateTfxResource = (slug, project = PROJECT) => {
	const compiledContent = poObjToPoString(getLocalTrnSourcePo());
	// allow override for push to mup-web-master
	return tfx.api
		.uploadSourceLanguageMethod(
			project,
			slug,
			resourceContent(slug, compiledContent)
		)
		.then(
			logSuccess('update', slug),
			logError('ERROR: Failed to update resource.')
		);
};

const deleteTxResource = slug =>
	tfx.api
		.resourceDeleteMethod(PROJECT, slug)
		.then(logSuccess('deleted', slug));

// PoTrn => Array<{ key: string, translation: string }>
const poToUploadFormat = trnObj =>
	Object.keys(trnObj).reduce(
		(arr, key) => arr.concat({ key, translation: trnObj[key].msgstr[0] }),
		[]
	);

const pick = (obj, keys) =>
	Object.keys(obj)
		.filter(k => keys.includes(k))
		.reduce((acc, key) => {
			acc[key] = obj[key];
			return acc;
		}, {});

const filterPoContentByKeys = (keys, poContent) => pick(poContent, keys);

const poObjToMsgObj = trns =>
	Object.keys(trns).reduce((acc, key) => {
		acc[key] = trns[key].msgstr[0];
		return acc;
	}, {});

const _fileToLocaleTuple = filename => {
	const lang_tag = path.basename(filename, '.po');
	return [lang_tag, poStringToPoObj(fs.readFileSync(filename).toString())];
};
const getAllLocalPoContent = memoize(() =>
	glob.sync(`${PO_PATH}!(en-US).po`).map(_fileToLocaleTuple)
);

// map of locale code to translated content formatted for React-Intl
const getLocalLocaleMessages = () => {
	const poContent = glob
		.sync(`${PO_PATH}*.po`)
		// read and parse all po files
		.map(_fileToLocaleTuple)
		.reduce((obj, [lang_tag, poObj]) => {
			obj[lang_tag] = poObjToMsgObj(poObj);
			return obj;
		}, {});
	// assign es-ES fallbacks - extend base 'es' translations with
	// any existing 'es-ES'-specific translations into a new object
	poContent['es-ES'] = Object.assign({}, poContent['es'], poContent['es-ES']);
	return poContent;
};

const getTfxMaster = () =>
	readTfxResource(MASTER_RESOURCE, PROJECT_MASTER)
		.then(
			logSuccess('master resource read complete'),
			logError('master resource read fail')
		)
		.then(poStringToPoObj);

// sometimes we want to compare against master, sometimes master plus existing resources
const diffVerbose = (master, content) =>
	Promise.all([master, content])
		.then(([main, trns]) => {
			console.log(
				'reference trns',
				Object.keys(main).length,
				' / trns extracted:',
				Object.keys(trns).length
			);
			return diff([main, trns]);
		})
		.then(trnDiff => {
			console.log('trns added / updated:', Object.keys(trnDiff).length);
			return trnDiff;
		});

const lastUpdateComparator = (a, b) =>
	new Date(a['last_update']) - new Date(b['last_update']);

// resource slugs sorted by last modified date
const getTfxResources = memoize(() =>
	tfx.api
		.projectInstanceMethods(PROJECT)
		.then()
		.then(projectData =>
			Promise.all(
				projectData.resources.map(resource =>
					tfx.api.resourcesInstanceMethods(PROJECT, resource['slug'])
				)
			)
		)
		.then(resourceInfo =>
			resourceInfo
				.sort(lastUpdateComparator)
				.map(resource => resource['slug'])
		)
);

// from the supplied resource statistics, create a map of locale code to
// translation completion value if less than 100%
const getCompletionValue = stat =>
	Object.keys(stat)
		// filter out secondary locale tags. they don't matter for completion
		.filter(key => localesSecondary.indexOf(key) === -1)
		// reduce to object that only has incomplete languages
		.reduce((localeCompletion, locale_tag) => {
			stat[locale_tag].completed !== '100%' &&
				(localeCompletion[locale_tag] = stat[locale_tag].completed);
			return localeCompletion;
		}, {});

// () => Promise<Array<[resourceName, { LocaleCode: string }]>>
const getTfxResourceCompletion = memoize(() =>
	getTfxResources()
		// get resource completion percentage
		.then(resources =>
			Promise.all(
				resources.map(resource =>
					tfx.api
						.statisticsMethods(PROJECT, resource)
						.then(getCompletionValue)
						.then(localeCompletion => [resource, localeCompletion])
				)
			)
		)
);

const getTfxResourcesIncomplete = () =>
	getTfxResourceCompletion().then(resources =>
		resources.filter(([r, completion]) => Object.keys(completion).length)
	);

const getTfxResourcesComplete = () =>
	getTfxResourceCompletion().then(resources =>
		resources
			.filter(([r, completion]) => Object.keys(completion).length === 0)
			.map(([r, completion]) => r)
	);

// Helper to update tx resource with all local trns
const updateAllMessages = (resource, project) => {
	return updateTfxResource(resource, project)
		.then(
			logSuccess(`update ${project} - ${resource} success`),
			logError(`update ${project} - ${resource} FAIL!`)
		)
		.then(updateResult => [resource, updateResult]);
};

// convenience function for updating project's master resource
const updateMasterContent = () =>
	updateAllMessages(MASTER_RESOURCE, PROJECT_MASTER);
// convenience function for updating project's all_translations resource
const updateAllTranslationsResource = () =>
	updateAllMessages(ALL_TRANSLATIONS_RESOURCE, PROJECT);

const uploadTrnsMaster = ([lang_tag, content]) => {
	exitOnMaster();
	return tfx.api
		.uploadTranslationInstanceMethod(
			PROJECT_MASTER,
			MASTER_RESOURCE,
			lang_tag,
			resourceContent(MASTER_RESOURCE, content)
		)
		.then(
			logSuccess('Uploaded master:', lang_tag),
			logError('Error uploading master:', lang_tag)
		);
};

// Helper to update master with all local translated content
// TODO: unit test when tfx can be mocked
const updateTranslations = () =>
	Promise.all(
		getAllLocalPoContent()
			.map(([lang_tag, poContent]) => [
				lang_tag,
				poObjToPoString(poContent),
			])
			.map(uploadTrnsMaster)
	);

module.exports = {
	getAllLocalPoContent,
	getLocalLocaleMessages,
	ALL_TRANSLATIONS_RESOURCE,
	poObjToPoString,
	createTfxResource,
	deleteTxResource,
	diff,
	diffVerbose,
	filterPoContentByKeys,
	extractTrnSource,
	getLocalTrnSourcePo,
	MASTER_RESOURCE,
	reduceUniques,
	poStringToPoObj,
	poObjToMsgObj,
	poToUploadFormat,
	PROJECT,
	PROJECT_MASTER,
	msgDescriptorsToPoObj,
	readTfxResource,
	getTfxResources,
	getTfxResourcesComplete,
	getTfxResourcesIncomplete,
	getTfxMaster,
	updateTfxResource,
	uploadTrnsMaster,
	updateMasterContent,
	updateAllTranslationsResource,
	updateTranslations,
};
