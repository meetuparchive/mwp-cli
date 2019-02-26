const chalk = require('chalk');
const txlib = require('./util');
const pullResourceTrns = require('./util/pullResourceTrns');
const gitHelpers = require('./util/gitHelpers');

const getProjectResourcesList = () =>
	txlib
		.getTfxResources()
		// We want to sort the array of resources so that the ALL_TRANSLATIONS_RESOURCE is
		// downloaded first, this will allow other resources to be applied on top of
		// any changes in that resource. Hopefully, this should prevent any changes in
		// feature branches from being overridden by this resource
		.then(resources =>
			resources.sort(
				a => (a === txlib.ALL_TRANSLATIONS_RESOURCE ? -1 : 1)
			)
		);

/**
 * Kicks off process to downloaded an individual resources trns
 * @param  {String} resource resource slug to be used when we downloaded translations
 * @return {Observable} Observable of tx process
 */
const pullResource = resource => {
	console.log(chalk.cyan(`Starting tx:pull for '${resource}'`));
	return pullResourceTrns.pullResourceContent(resource).then(() => {
		// wait until all content has been downloaded before moving on to next tasks
		console.log(chalk.green(`\nCompleted tx:pull for '${resource}'`));
		return resource;
	});
};

const promiseSerial = funcs =>
	funcs.reduce(
		(promise, func) =>
			promise.then(result =>
				func().then(Array.prototype.concat.bind(result))
			),
		Promise.resolve([])
	);

const makeDeferredPull = doCommit => r => () =>
	pullResource(r).then(resource => {
		if (!doCommit) {
			return;
		}
		const commitMessage = `tx:pull for ${resource.replace(/-/g, '_')}`;
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
				default: false,
			},
		}),
	handler: argv => {
		console.log(chalk.magenta('Pulling all resources...'));

		getProjectResourcesList()
			.then(resources =>
				promiseSerial(resources.map(makeDeferredPull(argv.commit)))
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
