const path = require('path');

const getBrowserAppConfig = require(path.resolve(
	__dirname,
	'browserAppConfig'
));
const getServerAppConfig = require(path.resolve(__dirname, 'serverAppConfig'));
const vendorBundlesConfig = require(path.resolve(
	__dirname,
	'vendorBundlesConfig'
));

const settings = require(path.resolve(__dirname, 'settings'));

const getRelativeBundlePathGetter = (entry, output) => (stats, localeCode) => {
	const entryChunk = stats.toJson().assetsByChunkName[entry];
	const filename = entryChunk instanceof Array ? entryChunk[0] : entryChunk; // filename determined by webpack output.filename
	const fullPath = path.resolve(output, localeCode, filename);
	return path.relative(settings.outPath, fullPath);
};

module.exports = {
	getBrowserAppConfig,
	getRelativeBundlePathGetter,
	getServerAppConfig,
	settings,
	vendorBundlesConfig,
};
