const path = require('path');

const webpackDir = `${process.cwd()}/scripts/webpack`;

const getBrowserAppConfig = require(`${webpackDir}/browserAppConfig`);
const getServerAppConfig = require(`${webpackDir}/serverAppConfig`);
const settings = require(`${webpackDir}/settings`);
const vendorBundlesConfig = require(`${webpackDir}/vendorBundlesConfig`);

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
