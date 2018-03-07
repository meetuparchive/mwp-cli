const tar = require('tar-fs');
const gunzip = require('gunzip-maybe');
const chalk = require('chalk');

const { locales, package: packageConfig } = require('mwp-config');
const addLocalesOption = require('../../util/addLocalesOption');
const api = require('../buildUtils/cloudApi');

const { CI_BUILD_NUMBER } = process.env;
const unpackBundle = file =>
	file.createReadStream().pipe(gunzip()).pipe(tar.extract());

const getArchiveDir = ({ serviceId, versionId }) => `${serviceId}-${versionId}`;

module.exports = {
	command: 'pull',
	description: 'pull the built app from cloud storage',
	builder: yargs =>
		addLocalesOption(yargs).options({
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to pull',
			},
			serviceId: {
				default: packageConfig.gaeModuleId,
				describe: 'The GAE service name',
			},
			pollWait: {
				default: 5000, // 5 seconds
				describe: 'The time to wait between bundle progress checks',
			},
			timeout: {
				default: 30 * 60 * 1000,
				describe:
					'Time to wait for bundles to become available for pull',
			},
			tags: {
				default: locales,
				type: 'array',
				describe:
					'The bundle tags to pull - will poll until all are downloaded or timeout',
			},
		}),
	handler: argv => {
		const startTime = new Date();
		const { serviceId, versionId, timeout, tags } = argv;
		const expectedBundleCount = tags.length;
		const pulledBundles = [];

		// define recursive function to poll for completed app bundles
		const pull = () => {
			if (new Date() - startTime > timeout) {
				throw new Error(`Timeout - ${Math.floor(timeout / 1000)}sec`);
			}
			return api
				.list(getArchiveDir({ serviceId, versionId }))
				.then(bundles => {
					// only pull _new_ bundles
					const bundlesToPull = bundles.filter(
						b => !pulledBundles.some(({ name }) => name === b.name)
					);
					if (bundlesToPull.length) {
						// loop through bundles and unzip, untar contents
						bundlesToPull.forEach(unpackBundle);
						// add pulled bundles to complete array
						pulledBundles.push(...bundlesToPull);
						console.log(
							chalk.yellow(
								`${pulledBundles.length}/${expectedBundleCount}`
							),
							chalk.green('bundles pulled:')
						);
						console.log(
							pulledBundles.map(({ name }) => name).join('\n')
						);
					}

					if (pulledBundles.length === expectedBundleCount) {
						return;
					}
					// recurse after delay
					console.log(chalk.gray('Waiting for more bundles...'));
					return new Promise(resolve =>
						setTimeout(() => {
							resolve(pull());
						}, argv.pollWait)
					);
				})
				.catch(err => console.error(chalk.red(err)));
		};
		// kick off the polling
		console.log(chalk.blue(`Pulling build artifacts for v${versionId}...`));
		pull();
	},
};
