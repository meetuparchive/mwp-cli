const util = require('util');
const memoize = require('memoize-one');
const Transifex = require('transifex');
const {
	localesSecondary,
	package: { txProject: PROJECT },
} = require('mwp-config');

const poFormatters = require('./poFormatters');
const { logSuccess, logError } = require('./logger');

const { NODE_ENV, TRANSIFEX_USER, TRANSIFEX_PW } = process.env;

const PROJECT_MASTER = `${PROJECT}-master`; // separate project so translators don't confuse with branch content
const MASTER_RESOURCE = 'master';
const ALL_TRANSLATIONS_RESOURCE = 'all_translations';

const _api = new Transifex({
	project_slug: PROJECT,
	credential: `${TRANSIFEX_USER}:${TRANSIFEX_PW}`,
});

// promise-retrying utility function
const retry = (fn, retryCount) =>
	fn().catch(err => {
		if (!retryCount) {
			// no more retries - gotta throw
			throw err;
		}
		const retriesRemaining = retryCount - 1;
		console.log(`Retrying - ${retriesRemaining} attempts remaining`);
		return retry(fn, retriesRemaining);
	});

const authorize = () => {
	if (NODE_ENV === 'test') {
		return;
	}
	if (!TRANSIFEX_USER || !TRANSIFEX_PW) {
		throw new Error(
			`TRANSIFEX_USER and TRANSIFEX_PW must be set as environment variables
- get the values from an admin in #web-platform on Slack`
		);
	}
};

// set up Promisified interface with Transifex API
const promisifyTxMethods = [
	'sourceLanguageMethods',
	'resourceCreateMethod',
	'uploadSourceLanguageMethod',
	'resourceDeleteMethod',
	'projectInstanceMethods',
	'resourcesInstanceMethods',
	'statisticsMethods',
	'uploadTranslationInstanceMethod',
	'translationInstanceMethod',
];

const api = promisifyTxMethods.reduce((acc, key) => {
	acc[key] = memoize((...args) => {
		authorize();
		return util.promisify(_api[key].bind(_api))(...args);
	});
	return acc;
}, {});

const pullLang = (
	slug,
	lang_tag,
	project = slug === MASTER_RESOURCE ? PROJECT_MASTER : PROJECT
) =>
	api
		.translationInstanceMethod(project, slug, lang_tag)
		.then(poFormatters.poStringToPoObj);

const pullAll = (slug, project = PROJECT) =>
	retry(() => api.sourceLanguageMethods(project, slug), 5)
		.then(poFormatters.poStringToPoObj)
		.then(
			logSuccess(`Tfx read complete: ${project}/${slug}`),
			logError(`ERROR: Tfx read fail: ${project}/${slug}`)
		);

const lastUpdateComparator = (a, b) =>
	new Date(a['last_update']) - new Date(b['last_update']);

// resource slugs sorted by last modified date
const list = memoize((project = PROJECT) =>
	api
		.projectInstanceMethods(project)
		.then()
		.then(projectData =>
			Promise.all(
				projectData.resources.map(resource =>
					api.resourcesInstanceMethods(project, resource['slug'])
				)
			)
		)
		.then(resourceInfo =>
			resourceInfo
				.sort(lastUpdateComparator)
				.map(resource => resource['slug'])
		)
);

const create = (slug, poObj, project = PROJECT) => {
	const compiledContent = poFormatters.poObjToPoString(poObj);
	return api
		.resourceCreateMethod(
			project,
			poFormatters.poStringToPoResource(slug, compiledContent)
		)
		.then(
			logSuccess(`Created ${project}/${slug}`),
			logError('Failed to create resource.', slug)
		);
};

// from the supplied resource statistics, create a map of locale code to
// translation completion value if less than 100%
const getCompletionValue = stat =>
	Object.keys(stat)
		// filter out secondary locale tags. they don't matter for completion
		.filter(key => localesSecondary.indexOf(key) === -1)
		// reduce to object that only has incomplete languages
		.reduce((acc, locale_tag) => {
			if (stat[locale_tag].completed !== '100%') {
				acc[locale_tag] = stat[locale_tag].completed;
			}
			return acc;
		}, {});

// () => Promise<Array<[resourceSlug, { LocaleCode: string }]>>
const getTfxResourceCompletion = memoize(() =>
	list()
		// get resource completion percentage
		.then(slugs =>
			Promise.all(
				slugs.map(slug =>
					api
						.statisticsMethods(PROJECT, slug)
						.then(getCompletionValue)
						.then(localeCompletion => [slug, localeCompletion])
				)
			)
		)
);

const listIncomplete = () =>
	getTfxResourceCompletion().then(completionTuple =>
		completionTuple.filter(
			([r, completion]) => Object.keys(completion).length
		)
	);

const listComplete = () =>
	getTfxResourceCompletion().then(completionTuple =>
		completionTuple
			.filter(([r, completion]) => Object.keys(completion).length === 0)
			.map(([r, completion]) => r)
	);

const updateCopy = (
	[lang_tag, poString],
	slug,
	project = slug === MASTER_RESOURCE ? PROJECT_MASTER : PROJECT
) =>
	api
		.uploadTranslationInstanceMethod(
			project,
			slug,
			lang_tag,
			poFormatters.poStringToPoResource(slug, poString)
		)
		.then(
			logSuccess(`Uploaded ${project}/${slug}:${lang_tag}`),
			logError(`ERROR: failed uploading ${project}/${slug}:${lang_tag}`)
		);

const updateSrc = (
	slug,
	poObj,
	project = slug === MASTER_RESOURCE ? PROJECT_MASTER : PROJECT
) =>
	api
		.uploadSourceLanguageMethod(
			project,
			slug,
			poFormatters.poStringToPoResource(
				slug,
				poFormatters.poObjToPoString(poObj)
			)
		)
		.then(
			logSuccess(`Source update complete: ${project}/${slug}`),
			logError(`ERROR: Failed to update source: ${project}/${slug}`)
		);

const del = (slug, project = PROJECT) =>
	api.resourceDeleteMethod(project, slug).then(logSuccess('Deleted', slug));

const exists = branch => list().then(list => list.includes(branch));

const projectPullAll = (filter = () => true, project = PROJECT) =>
	list()
		// transform resource list to resource content, maintaining order
		.then(slugs =>
			Promise.all(slugs.filter(filter).map(slug => pullAll(slug)))
		)
		.then(resourcesContent =>
			resourcesContent.reduce(
				(acc, resourceTrns) => Object.assign(acc, resourceTrns),
				{}
			)
		);

const publicInterface = {
	PROJECT,
	PROJECT_MASTER,
	MASTER_RESOURCE,
	ALL_TRANSLATIONS_RESOURCE,
	project: {
		pullAll: projectPullAll,
	},
	resource: {
		pullLang,
		pullAll,
		list,
		listComplete,
		listIncomplete,
		create,
		updateCopy,
		updateSrc,
		del,
		exists,
	},
};

module.exports = publicInterface;
