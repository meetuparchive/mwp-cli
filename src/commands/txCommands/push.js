const chalk = require('chalk');
const txlib = require('./util');
const tfx = require('./util/transifex');

const pushTxMaster = require('./util/pushTxMaster');
const { gitBranch, exitOnMaster } = require('./util/gitHelpers');

const pushTxAllTranslations = () => {
	console.log(chalk.blue('pushing content to all_translations in mup-web'));
	txlib.updateTfxSrcAllTranslations().catch(error => {
		console.error(`encountered error during upload: ${error}`);
		process.exit(1);
	});
};

// Check if transifex resource exists for the supplied git branch name,
// defaulting to checking currently-checked-out branch
const checkTfxResourceExists = (branch = gitBranch()) =>
	tfx.resource.list().then(resources => resources.indexOf(branch) > -1);

// syncs content in po format to tx
const pushSrcDiff = poData =>
	checkTfxResourceExists().then(branchResourceExists => {
		const branch = gitBranch();
		if (Object.keys(poData).length) {
			console.log('translation keys:', Object.keys(poData).join(', '));
			console.log(
				branchResourceExists ? 'Updating' : 'Creating',
				'resource'
			);
			const push = branchResourceExists
				? tfx.resource.updateSrc
				: tfx.resource.create;
			return push(branch, poData);
		}
		// If there's no translation `po` data but the branch resource exists (in transifex), delete it from transifex
		if (branchResourceExists) {
			return tfx.resource
				.delete(branch)
				.then(() =>
					console.log(
						`Local branch trn data is empty - delete ${branch}`
					)
				);
		}
		return; // no data, no branch, no problem
	});

const getTfxResourceTrns = () =>
	txlib.resource
		.list()
		// get resources but filter out my current resource
		.then(resources => {
			const branch = gitBranch();
			return resources.filter(resource => resource !== branch);
		})
		// transform resource list to resource content, maintaining order
		.then(resources => resources.map(txlib.resource.pullAll))
		.then(resourcesContent =>
			resourcesContent.reduce(
				(joinedTrns, resourceTrns) =>
					Object.assign(joinedTrns, resourceTrns),
				{}
			)
		);

const masterAndResourceTrns = () =>
	Promise.all([txlib.getTfxMaster(), getTfxResourceTrns()]).then(
		([masterTrns, resourceTrns]) =>
			Object.assign({}, masterTrns, resourceTrns)
	);

const pushTrnSrc = () => {
	console.log(chalk.blue('pushing content to transifex'));
	return txlib
		.trnSrcDiffVerbose(masterAndResourceTrns(), txlib.getLocalTrnSourcePo())
		.then(pushSrcDiff);
};

module.exports = {
	command: 'push',
	description: 'push content to transifex',
	builder: yarg =>
		yarg.option({
			project: {
				alias: 'p',
				default: tfx.PROJECT,
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

		exitOnMaster();
		pushTrnSrc().catch(err => {
			console.error('Encountered error during push:', err);
			process.exit(1);
		});
	},
};
