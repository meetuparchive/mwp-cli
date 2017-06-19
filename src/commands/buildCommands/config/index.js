const path = require('path');

// webpack config getters
const {
	getBrowserAppConfig,
	getServerAppConfig,
	vendorBundlesConfig,
} = require('./webpack');
const paths = require('./paths');

// app-specific config
/*
 * A function to determine the build-directory-relative path to a bundle based
 * on webpack config values and build stats
 */
const getRelativeBundlePathGetter = (entry, output) => (
	stats,
	localeCode = ''
) => {
	const entryChunk = stats.toJson().assetsByChunkName[entry];
	const filename = entryChunk instanceof Array ? entryChunk[0] : entryChunk; // filename determined by webpack output.filename
	const fullPath = path.resolve(output, localeCode, filename);
	return path.relative(paths.outPath, fullPath);
};

module.exports = {
	getBrowserAppConfig,
	getServerAppConfig,
	vendorBundlesConfig,
	env: require('./env'),
	locales: require('./locales'),
	paths,
	getRelativeBundlePathGetter,
};
