const tar = require('tar-fs');
const gunzip = require('gunzip-maybe');
const chalk = require('chalk');

const { locales, package: packageConfig } = require('mwp-config');
const addLocalesOption = require('../../util/addLocalesOption');

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const { CI_BUILD_NUMBER } = process.env;

module.exports = {
	command: 'pull',
	description: 'pull the built app from cloud storage',
	builder: yargs =>
		addLocalesOption(yargs).options({
			s3Bucket: {
				demandOption: true,
				describe: 'Name of AWS S3 bucket',
			},
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to pull',
			},
			pollWait: {
				default: 5000, // 5 seconds
				describe: 'The time to wait between bundle progress checks',
			},
			timeout: {
				default: 30 * 60 * 1000,
				describe: 'Time to wait for bundles to become available for pull',
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
		const { s3Bucket, versionId, timeout, tags } = argv;
		const expectedBundleCount = tags.length;
		const pulledBundles = [];

		console.log(
			chalk.blue(`Expecting ${expectedBundleCount} bundles: ${tags.join(', ')}`)
		);

		// define recursive function to poll for completed app bundles
		const pull = () => {
			const archiveDir = `${versionId}/`;

			if (new Date() - startTime > timeout) {
				throw new Error(`Timeout - ${Math.floor(timeout / 1000)}sec`);
			}

			console.log(
				chalk.blue(`Searching for bundles in s3://${s3Bucket}/${archiveDir}`)
			);

			return s3
				.listObjectsV2({
					Bucket: s3Bucket,
					Prefix: archiveDir,
				})
				.promise() // AWS SDK promise instead of default callback
				.then(s3Response =>
					s3Response.Contents.map(s3Object => s3Object.Key).filter(
						fileName => fileName !== archiveDir
					)
				)
				.then(bundles => {
					// only pull _new_ bundles
					const bundlesToPull = bundles.filter(
						bundleName => !pulledBundles.some(name => name === bundleName)
					);
					if (bundlesToPull.length) {
						// loop through bundles and unzip, untar contents
						bundlesToPull.forEach(bundleName =>
							s3
								.getObject({
									Bucket: s3Bucket,
									Key: bundleName,
								})
								.createReadStream()
								.pipe(gunzip())
								.pipe(tar.extract())
						);

						// add pulled bundles to complete array
						pulledBundles.push(...bundlesToPull);
						console.log(
							chalk.yellow(
								`${pulledBundles.length}/${expectedBundleCount}`
							),
							chalk.green('bundles pulled:')
						);
						console.log(pulledBundles.join('\n'));
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
				.catch(err => {
					console.error(chalk.red(err));
					process.exit(1);
				});
		};
		// kick off the polling
		console.log(chalk.blue(`Pulling build artifacts for v${versionId}...`));
		pull();
	},
};
