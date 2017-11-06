const babel = require('babel-core');
const fs = require('fs');
const gettextParser = require('gettext-parser');
const glob = require('glob');
const _ = require('lodash');
const path = require('path');
const { paths, package: packageConfig, localesSecondary } = require('../../../config');
const Rx = require('rxjs');
const Transifex = require('transifex');

const TX_USER = process.env.TRANSIFEX_USER;
const TX_PW = process.env.TRANSIFEX_PW;
const PROJECT = packageConfig.txProject;
const PROJECT_MASTER = `${PROJECT}-master`; // separate project so translators don't confuse with branch content
const MASTER_RESOURCE = 'master';

const tx = new Transifex({
	project_slug: PROJECT,
	credential: `${TX_USER}:${TX_PW}`,
});

const checkEnvVars = () => {
	if (!TX_USER || !TX_PW) {
		throw new Error(
			`TRANSIFEX_USER and TRANSIFEX_PW must be set as environment variables
- get the values from an admin in #web-platform on Slack`
		);
	}
};

// local streams
const readFile$ = filepath =>
	Rx.Observable.bindNodeCallback(fs.readFile)(filepath).map(buffer =>
		buffer.toString()
	);

const parsePluckTrns = fileContent =>
	Rx.Observable
		.of(fileContent)
		.map(gettextParser.po.parse)
		.pluck('translations', '')
		.map(trnObj => {
			delete trnObj[''];
			return trnObj;
		}) // filters out header info
		.map(trnObj =>
			Object.keys(trnObj).reduce((acc, key) => {
				if (trnObj[key].msgstr[0]) {
					// effectively filtering out empty trn content
					acc[key] = trnObj[key];
				}
				return acc;
			}, {})
		);

// returns main.po trn content in po format
const localPoTrns$ = filename =>
	readFile$(path.resolve(paths.repoRoot, `src/trns/po/${filename}.po`)).flatMap(
		parsePluckTrns
	);

// adds necessary header info to po formatted trn content
const wrapPoTrns = trnObjs => ({
	charset: 'utf-8',
	headers: {
		'content-type': 'text/plain; charset=utf-8',
	},
	translations: {
		'': trnObjs,
	},
});

// take a set of po trns and compile a po file
const wrapCompilePo$ = poObj =>
	Rx.Observable
		.of(poObj)
		.map(wrapPoTrns)
		.map(gettextParser.po.compile)
		.map(buf => `${buf.toString()}\n`); // we now have a po file

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

// used to ensure trn keys are unique
const mergeIfUniqueKeys = ({ data, errors }, toMerge) => {
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
const mergeLocalTrns = localTrns => {
	const { data, errors } = localTrns.reduce(mergeIfUniqueKeys, {
		data: {},
		errors: {},
	});
	if (Object.keys(errors).length > 0) {
		throw new Error(`dupe keys: ${JSON.stringify(errors, null, 2)}`);
	}

	return data;
};

const reactIntlToPo = reactIntl =>
	reactIntl.reduce((obj, trnObj) => {
		if (typeof trnObj.description !== 'object' || !trnObj.description.jira) {
			throw new Error('Trn content missing jira story reference', trnObj);
		}

		obj[trnObj.id] = {
			msgid: trnObj.id,
			msgstr: [trnObj.defaultMessage],
			comments: {
				extracted: trnObj.description.text,
				translator: trnObj.description.jira,
				reference: `${trnObj.file}:${trnObj.start.line}:${trnObj.start.column}`,
			},
		};

		return obj;
	}, {});

// returns observable of extracted trn data in react-intl format. one value per file-with-content
const localTrns$ = Rx.Observable.bindNodeCallback(glob)(
	paths.repoRoot + '/src/+(components|app)/**/!(*.test|*.story).jsx'
)
	.flatMap(Rx.Observable.from)
	.map(file =>
		babel.transformFileSync(file, {
			plugins: [['react-intl', { extractSourceLocation: true }]],
		})
	)
	.pluck('metadata', 'react-intl', 'messages')
	.filter(trns => trns.length);

// obervable that returns a single value which is an object containing all local trn content
const localTrnsMerged$ = localTrns$
	.map(reactIntlToPo)
	.toArray()
	.map(mergeLocalTrns);

// required fields for resource creation and updating. http://docs.transifex.com/api/resources/#post
const resourceContent = (slug, content) => ({
	slug,
	name: slug,
	i18n_type: 'PO',
	content,
});

const createResource$ = (slug, content) => {
	return wrapCompilePo$(content)
		.flatMap(compiledContent =>
			Rx.Observable.bindNodeCallback(tx.resourceCreateMethod.bind(tx))(
				PROJECT,
				resourceContent(slug, compiledContent)
			)
		)
		.do(() => console.log('create', slug));
};

const readResource$ = (slug, project = PROJECT) =>
	Rx.Observable.bindNodeCallback(tx.sourceLanguageMethods.bind(tx))(
		project,
		slug
	)
		.retry(5)
		.do(null, () => console.log(`error readResource$ ${slug} ${project}`));

const updateResource$ = (slug, content, project = PROJECT) => {
	// allow override for push to mup-web-master
	return wrapCompilePo$(content)
		.flatMap(compiledContent =>
			Rx.Observable.bindNodeCallback(tx.uploadSourceLanguageMethod.bind(tx))(
				project,
				slug,
				resourceContent(slug, compiledContent)
			)
		)
		.do(() => console.log('update', slug));
};

const deleteResource$ = slug =>
	Rx.Observable.bindNodeCallback(tx.resourceDeleteMethod.bind(tx))(
		PROJECT,
		slug
	).do(() => console.log('delete', slug));

const uploadTrnsMaster$ = ([lang_tag, content]) =>
	Rx.Observable.bindNodeCallback(tx.uploadTranslationInstanceMethod.bind(tx))(
		PROJECT_MASTER,
		MASTER_RESOURCE,
		lang_tag,
		resourceContent(MASTER_RESOURCE, content)
	)
		.do(response => {
			console.log(lang_tag);
			console.log(response);
		},
		() => console.log(`error uploadTrnsMaster$ ${lang_tag}`)
		)

const uploadTranslation$ = ([lang_tag, content]) =>
	Rx.Observable.bindNodeCallback(tx.translationStringsPutMethod.bind(tx))(
		PROJECT_MASTER,
		MASTER_RESOURCE,
		lang_tag,
		content
	).do(() => console.log(`translation upload complete - ${lang_tag}`), () => console.log(`translation upload FAIL - ${lang_tag}`));

const uploadTranslationsForKeys$ = keys => allLocalPoTrns$
	.flatMap(([lang_tag, content]) => filterPoContentByKeys$(keys, content)
		.map(poToUploadFormat)
		.map(filteredTrnObj => [lang_tag, filteredTrnObj])
	)
	.flatMap(uploadTranslation$)

const poToUploadFormat = trnObj =>
	Object.keys(trnObj)
		.reduce((arr, key) =>
			arr.concat({ 'key': key, 'translation': trnObj[key].msgstr[0] }), [])

const filterPoContentByKeys$ = (keys, poContent) => Rx.Observable.of(poContent)
	.map(trnObj => _.pick(trnObj, keys)) // return object with specified keys only
	.filter(obj => !_.isEmpty(obj)) // remove empty objects

const poToReactIntlFormat = trns => _.mapValues(trns, val => val.msgstr[0])

const poPath = path.resolve(paths.repoRoot, 'src/trns/po/') + '/';

const allLocalPoTrns$ = Rx.Observable.bindNodeCallback(glob)(
	poPath + '!(en-US).po'
)
	.flatMap(Rx.Observable.from)
	.flatMap(filename => {
		const lang_tag = path.basename(filename, '.po');
		return readFile$(filename)
			.flatMap(parsePluckTrns)
			.map(content => [lang_tag, content]);
	});

const allLocalPoTrnsWithFallbacks$ = Rx.Observable.bindNodeCallback(glob)(
	poPath + '*.po'
)
	.flatMap(Rx.Observable.from)
	// read and parse all po files
	.flatMap(filename => {
		const lang_tag = path.basename(filename, '.po');
		return (
			readFile$(filename)
				.flatMap(content => parsePluckTrns(content))
				// po obj format to key / value
				.map(poToReactIntlFormat)
				.map(parsedContent => [lang_tag, parsedContent])
		);
	})
	.reduce((obj, [lang_tag, content]) => {
		obj[lang_tag] = content;
		return obj;
	}, {})
	.map(contentCompiled => {
		contentCompiled['es-ES'] = Object.assign(
			{},
			contentCompiled['es'],
			contentCompiled['es-ES']
		);
		return contentCompiled;
	});

const txMasterTrns$ = readResource$(MASTER_RESOURCE, PROJECT_MASTER)
	.do(() => console.log('master resource read complete'), () => console.log('master resource read fail'))
	.flatMap(parsePluckTrns);

// sometimes we want to compare against master, sometimes master plus existing resources
const diffVerbose$ = (master$, content$) =>
	master$.concat(content$).toArray() // resolves resource contention issue. equivalent to .zip
		.do(([main, trns]) =>
			console.log(
				'reference trns',
				Object.keys(main).length,
				' / trns extracted:',
				Object.keys(trns).length
			)
		)
		.map(diff) // return local content that is new or updated
		.do(diff => console.log('trns added / updated:', Object.keys(diff).length))

const projectInfo$ = Rx.Observable.bindNodeCallback(
	tx.projectInstanceMethods.bind(tx)
);

const resourceInfo$ = Rx.Observable.bindNodeCallback(
	tx.resourcesInstanceMethods.bind(tx)
);

const lastUpdateComparator = (a, b) =>
	new Date(a['last_update']) - new Date(b['last_update']);

// resource slugs sorted by last modified date
const resources$ =
	projectInfo$(PROJECT)
		.pluck('resources')
		.flatMap(Rx.Observable.from)
		.flatMap(resource => resourceInfo$(PROJECT, resource['slug']))
		.toArray()
		.map(resourceInfo =>
			resourceInfo.sort(lastUpdateComparator).map(resource => resource['slug'])
		);

const resourceStats$ = Rx.Observable.bindNodeCallback(
	tx.statisticsMethods.bind(tx)
);

const resourceCompletion$ = resources$
	.flatMap(Rx.Observable.from)
	// get resource completion percentage
	.flatMap(resource => resourceStats$(PROJECT, resource)
		// reduce the amount of data we're working with
		.map(resourceStat => Object.keys(resourceStat)
			// filter out secondary locale tags. they don't matter for completion
			.filter(key => localesSecondary.indexOf(key) === -1)
			// reduce to object that only has incomplete languages
			.reduce((localeCompletion, locale_tag) => {
				resourceStat[locale_tag].completed !== '100%'
					&& (localeCompletion[locale_tag] = resourceStat[locale_tag].completed);
				return localeCompletion;
			}, {})
		)
		.map(localeCompletion => [resource, localeCompletion])
	);

const resourcesIncomplete$ = resourceCompletion$
	.filter(item => Object.keys(item[1]).length);

const resourcesComplete$ = resourceCompletion$
	.filter(item => Object.keys(item[1]).length === 0)
	.map(([resource, lang_completion]) => resource);

module.exports = {
	allLocalPoTrns$,
	allLocalPoTrnsWithFallbacks$,
	checkEnvVars,
	createResource$,
	deleteResource$,
	diff,
	diffVerbose$,
	filterPoContentByKeys$,
	localTrns$,
	localPoTrns$,
	localTrnsMerged$,
	MASTER_RESOURCE,
	mergeLocalTrns,
	parsePluckTrns,
	poToReactIntlFormat,
	poToUploadFormat,
	PROJECT,
	PROJECT_MASTER,
	reactIntlToPo,
	readFile$,
	readResource$,
	resources$,
	resourcesComplete$,
	resourcesIncomplete$,
	resourceCompletion$,
	tx,
	txMasterTrns$,
	updateResource$,
	uploadTranslation$,
	uploadTranslationsForKeys$,
	uploadTrnsMaster$,
	wrapCompilePo$,
	wrapPoTrns,
};
