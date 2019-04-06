const chalk = require('chalk');
const txlib = require('./util');
const gitHelpers = require('./util/gitHelpers');

const getProjectResourcesList = () =>
	txlib.resource
		.list()
		// We want to sort the array of resources so that the ALL_TRANSLATIONS_RESOURCE is
		// downloaded first, this will allow other resources to be applied on top of
		// any changes in that resource. This should prevent any changes in
		// feature branches from being overwritten by this resource
		.then(slugs =>
			slugs.sort(a => (a === txlib.ALL_TRANSLATIONS_RESOURCE ? -1 : 1))
		);

/**
 * Download individual resources trns
 * @param  {String} slug resource name/slug that Tx uses as a unique resource identifier
 */
const pullResource = slug => {
	console.log(chalk.cyan(`Starting tx:pull for '${slug}'`));
	return txlib.pullResourceContent(slug).then(() => {
		// wait until all content has been downloaded before moving on to next tasks
		console.log(chalk.green(`\nCompleted tx:pull for '${slug}'`));
		return slug;
	});
};

// Utility function to execute Promise-returning functions one at a time.
// Useful for cases where parallel execution might result in throttling
// or fragile race conditions
const promiseSerial = funcs =>
	funcs.reduce(
		(promise, func) =>
			promise.then(result =>
				func().then(Array.prototype.concat.bind(result))
			),
		Promise.resolve([])
	);

// create a function that creates a resource 'pull' Promise. This can be
// composed with `resource.map` and `promiseSerial` in order to pull an
// array of resources sequentially
const makeDeferredPull = doCommit => slug => () =>
	pullResource(slug).then(slug => {
		if (!doCommit) {
			return;
		}
		const commitMessage = `tx:pull for ${slug.replace(/-/g, '_')}`;
		return gitHelpers.commit(commitMessage, `--no-verify`);
	});

module.exports = {
	command: 'pullAll',
	description:
		'Downloads all translations for resources from Transifex, ordered by most recently updated',
	builder: yarg =>
		yarg.option({
			commit: {
				alias: 'c',
				describe:
					'automatically commit the downloaded translations to the current branch',
				default: false,
			},
		}),
	handler: argv => {
		console.log(chalk.magenta('Pulling all resources...'));

		getProjectResourcesList()
			.then(slugs =>
				promiseSerial(slugs.map(makeDeferredPull(argv.commit)))
			)
			.then(
				() => console.log(chalk.green('All resources pulled.')),
				err => {
					console.error(err);
					process.exit(1);
				}
			);
	},
};
