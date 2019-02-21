const chalk = require('chalk');
const txlib = require('./util');

const pushTxMaster = require('./util/pushTxMaster');
const pushTxAllTranslations = require('./util/pushTxAllTranslations');
const { gitBranch } = require('./util/gitHelpers');
const checkNotMaster = require('./util/checkNotMaster');

const readParseResource = slug =>
	txlib.readTfxResource(slug).then(txlib.parsePluckTrns);

const branchResourceExists$ = () =>
	Promise.all(txlib.getTfxResources(), gitBranch()).then(
		([resources, branch]) => resources.indexOf(branch) > -1
	);

// syncs content in po format to tx
const pushResource = poData =>
	Promise.all(gitBranch(), branchResourceExists$()).then(
		([gitBranch, branchResourceExists]) => {
			if (Object.keys(poData)) {
				console.log(
					'translation keys:',
					Object.keys(poData).join(', ')
				);
				console.log(
					branchResourceExists ? 'Updating' : 'Creating',
					'resource'
				);
				const push = branchResourceExists
					? txlib.updateResource
					: txlib.createResource;
				return push(gitBranch, poData);
			}

			if (branchResourceExists) {
				return txlib
					.deleteTxResource(gitBranch)
					.then(() =>
						console.log(
							`Local branch trn data is empty - delete ${gitBranch}`
						)
					);
			}
			return; // no data, no branch, no problem
		}
	);

const getTfxResourceTrns = () =>
	Promise.all(gitBranch(), txlib.getTfxResources())
		// get resources but filter out my current resource
		.then(([gitBranch, resources]) =>
			resources.filter(resource => resource !== gitBranch)
		)
		// transform resource list to resource content, maintaining order
		.then(resources => resources.map(readParseResource))
		.then(resourcesContent =>
			resourcesContent.reduce(
				(joinedTrns, resourceTrns) =>
					Object.assign(joinedTrns, resourceTrns),
				{}
			)
		);

const masterAndResourceTrns = () =>
	Promise.all(txlib.getTfxMaster(), getTfxResourceTrns()).map(
		([masterTrns, resourceTrns]) =>
			Object.assign({}, masterTrns, resourceTrns)
	);

const pushContent = () => {
	console.log(chalk.blue('pushing content to transifex'));
	return txlib
		.diffVerbose(masterAndResourceTrns(), txlib.getMergedLocalTrns())
		.then(pushResource);
};

module.exports = {
	command: 'push',
	description: 'push content to transifex',
	builder: yarg =>
		yarg.option({
			project: {
				alias: 'p',
				default: txlib.PROJECT,
			},
			all: {
				alias: 'a',
				default: false,
			},
		}),
	handler: argv => {
		if (argv.project === txlib.MASTER_RESOURCE) {
			return pushTxMaster();
		}

		if (argv.all) {
			return pushTxAllTranslations();
		}

		checkNotMaster()
			.then(pushContent)
			.catch(err => {
				console.error(`Encountered error during push: ${err}`);
				process.exit(1);
			});
	},
};
