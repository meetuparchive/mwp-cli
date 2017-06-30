const babel = require('babel-core');
const fs = require('fs');
const gettextParser = require('gettext-parser');
const glob = require('glob');
const path = require('path');
const paths = require('../../../util/paths');
const Rx = require('rxjs');
const Transifex = require('transifex');

const TX_USER = process.env.TRANSIFEX_USER;
const TX_PW = process.env.TRANSIFEX_PW;
const PROJECT = require('../../../util/packageConfig');
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
	Rx.Observable
		.bindNodeCallback(fs.readFile)(filepath)
		.map(buffer => buffer.toString());

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
	readFile$(path.resolve(paths.repoRoot,`src/trns/po/${filename}.po`)).flatMap(parsePluckTrns);

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
const localTrns$ = Rx.Observable
	.bindNodeCallback(glob)(paths.repoRoot + '/src/+(components|app)/**/!(*.test|*.story).jsx')
	.flatMap(Rx.Observable.from)
	.map(file => babel.transformFileSync(file, {
			plugins: [['react-intl', { extractSourceLocation: true }]],
	}))
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
	);

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
	Rx.Observable
		.bindNodeCallback(tx.resourceDeleteMethod.bind(tx))(PROJECT, slug)
		.do(() => console.log('delete', slug));

const uploadTrnsMaster$ = ([lang_tag, content]) =>
	Rx.Observable.bindNodeCallback(tx.uploadTranslationInstanceMethod.bind(tx))(
		PROJECT_MASTER,
		MASTER_RESOURCE,
		lang_tag,
		resourceContent(MASTER_RESOURCE, content)
	);

const poPath = path.resolve(paths.repoRoot,'src/trns/po/');

const allLocalPoTrns$ = Rx.Observable
	.bindNodeCallback(glob)(poPath + '!(en-US).po')
	.flatMap(Rx.Observable.from)
	.flatMap(filename => {
		const lang_tag = path.basename(filename, '.po');
		return readFile$(filename).map(content => [lang_tag, content]);
	});

const allLocalPoTrnsWithFallbacks$ = Rx.Observable
	.bindNodeCallback(glob)(poPath + '*.po')
	.flatMap(Rx.Observable.from)
	// read and parse all po files
	.flatMap(filename => {
		const lang_tag = path.basename(filename, '.po');
		return (
			readFile$(filename)
				.flatMap(content => parsePluckTrns(content))
				// po obj format to key / value
				.map(trns =>
					Object.keys(trns).reduce((messages, trnKey) => {
						messages[trnKey] = trns[trnKey].msgstr[0];
						return messages;
					}, {})
				)
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

module.exports = {
	allLocalPoTrns$,
	allLocalPoTrnsWithFallbacks$,
	checkEnvVars,
	createResource$,
	deleteResource$,
	diff,
	localTrns$,
	localPoTrns$,
	localTrnsMerged$,
	MASTER_RESOURCE,
	mergeLocalTrns,
	parsePluckTrns,
	PROJECT,
	PROJECT_MASTER,
	reactIntlToPo,
	readFile$,
	readResource$,
	tx,
	updateResource$,
	uploadTrnsMaster$,
	wrapCompilePo$,
	wrapPoTrns,
};
