const util = require('util');
const memoize = require('memoize-one');

const Transifex = require('transifex');
const { package: packageConfig } = require('mwp-config');
const PROJECT = packageConfig.txProject;
const { NODE_ENV, TRANSIFEX_USER, TRANSIFEX_PW } = process.env;

const _api = new Transifex({
	project_slug: PROJECT,
	credential: `${TRANSIFEX_USER}:${TRANSIFEX_PW}`,
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

const publicInterface = {
	api: promisifyTxMethods.reduce((acc, key) => {
		acc[key] = memoize((...args) => {
			authorize();
			return util.promisify(_api[key].bind(_api))(...args);
		});
		return acc;
	}, {}),
	PROJECT,
};

module.exports = publicInterface;
