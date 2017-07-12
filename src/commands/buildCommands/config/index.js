const path = require('path');

// application-relative paths
const paths = require('./paths');

// app-specific config
/*
 * A function to determine the build-directory-relative path to a bundle based
 * on webpack config values and build stats
 */
const getRelativeBundlePath = (entry, output) => (stats, localeCode = '') => {
	const entryChunk = stats.toJson().assetsByChunkName[entry];
	const filename = entryChunk instanceof Array ? entryChunk[0] : entryChunk; // filename determined by webpack output.filename
	const fullPath = path.resolve(output, localeCode, filename);
	return path.relative(paths.buildPath, fullPath);
};

module.exports = {
	env: require('./env'),
	locales: require('./locales'),
	webpack: require('./webpack'),
	paths,
	getRelativeBundlePath,
};
