const fs = require('fs');
const glob = require('glob');
const readJson = require('webpack-bundle-diff/lib/util/readJson').default;
const {
	deriveChunkGroupData,
} = require('webpack-bundle-diff/lib/api/deriveBundleData/deriveChunkGroupData');

/**
 * This script reads the 'stats.json' output of the webpack build
 * in order to track the size of all app 'chunks'. The size of each chunk
 * is logged in DataDog for timeseries tracking. We are interested in knowing
 * how the size of the app is growing over time, and whether particular
 * builds introduce any unexpected changes in chunk sizes.
 */

/*
// output of deriveChunkGroupData
type ChunkGroupData = {
	[chunkName: string]: {
		size: number,
		assets: Array<string>,
		ignoredAssets: Array<string>
	},
}
*/

// only need to report the stats from one language build - en-US because it
// was the first one we supported
// When generalizing to CLI (WP-1056), consume this as a CLI option, defaulting to this path
const BUNDLE_PATH = './build/browser-app/en-US';
const STATS_PATH = `${BUNDLE_PATH}/stats.json`;

const NOW = new Date().getTime() / 1000; // one timestamp in seconds for all reported metrics
const vendorBundleGlobs = [
	'./build/browser-app/react.*.js',
	'./build/browser-app/vendor.*.js',
];

// all metrics get the same set of tags
const getTags = (chunkName, application, build) => [
	`chunkName:${chunkName}`,
	`application:${application}`,
	`build:${build}`,
];

// get metric for individual file matching globPattern
const getBundleSizeMetric = (globPattern, application, build) => {
	const matchingFiles = glob.sync(globPattern);
	if (!matchingFiles.length) {
		throw new Error(`no files matching ${globPattern}`);
	}
	const filename = matchingFiles[0];
	const fileBasename = filename.match(/[^.]+/)[0]; // strip hash, extension
	const stats = fs.statSync(filename);
	return {
		metric: 'mwp.bundle.chunk.size',
		points: [[NOW, stats.size]],
		tags: getTags(fileBasename, application, build),
	};
};

// get all metrics for app bundle chunks
const getStatsMetrics = (application, build) => {
	if (!fs.existsSync(STATS_PATH)) {
		return Promise.reject(`${STATS_PATH} not found`);
	}
	return readJson(STATS_PATH)
		.then(deriveChunkGroupData) // BundleData type described above
		.then(chunkGroupData => {
			const chunkNames = Object.keys(chunkGroupData);
			return chunkNames.map(name => {
				const { size } = chunkGroupData[name]; // bytes
				return {
					metric: 'mwp.bundle.chunk.size',
					points: [[NOW, size]],
					tags: getTags(name, application, build),
				};
			});
		});
};

// get total size of all js files in the supplied directory
const getTotalMetric = (dirPath, application, build) => {
	const jsFiles = glob.sync(`${dirPath}/*.js`);
	const totalSize = jsFiles.reduce((acc, filename) => {
		acc = acc + fs.statSync(filename).size;
		return acc;
	}, 0);
	return {
		metric: 'mwp.bundle.size',
		points: [[NOW, totalSize]],
		tags: [`application:${application}`, `build:${build}`],
	};
};

// Collect all metrics
const getMetrics = (application, build) =>
	getStatsMetrics(application, build).then(statsMetrics => {
		const totalMetric = getTotalMetric(BUNDLE_PATH, application, build);
		const vendorMetrics = vendorBundleGlobs.map(globaPattern =>
			getBundleSizeMetric(globaPattern, application, build)
		);
		return [totalMetric, ...statsMetrics, ...vendorMetrics];
	});

module.exports = { getMetrics };
