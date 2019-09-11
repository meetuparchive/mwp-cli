const chalk = require('chalk');
const txlib = require('./util');
const tfx = require('./util/transifex');

const pushTxMaster = require('./util/pushTxMaster');
const { gitBranch, exitOnMaster } = require('./util/gitHelpers');

// syncs content in po format to Transifex
const pushSrcDiff = poData => {
	const branch = gitBranch();
	return tfx.resource.exists(branch).then(branchResourceExists => {
		if (Object.keys(poData).length) {
			console.log(chalk.blue('Pushing new source content to Transifex'));
			console.log('keys:', Object.keys(poData).join(', '));
			console.log(branchResourceExists ? 'Updating' : 'Creating', 'resource');
			const push = branchResourceExists
				? tfx.resource.updateSrc
				: tfx.resource.create;
			return push(branch, poData);
		}
		// If there's no translation `po` data but the branch resource exists in Transifex,
		// delete it from Transifex
		if (branchResourceExists) {
			return tfx.resource
				.del(branch)
				.then(() =>
					console.log(
						'Local branch trn data is empty',
						` - deleted ${tfx.PROJECT}/${branch}`
					)
				);
		}
		return; // no data, no branch, no problem
	});
};

const masterAndResourceTrns = () =>
	Promise.all([
		tfx.resource.pullAll(tfx.MASTER_RESOURCE, tfx.PROJECT_MASTER),
		tfx.project.pullAll(resource => resource !== gitBranch()),
	]).then(([masterTrns, resourceTrns]) =>
		Object.assign({}, masterTrns, resourceTrns)
	);

// Upload any TRN source content that is defined locally but _not_ present on
// any other resource in Transifex
const pushTrnSrc = () => {
	return txlib
		.trnSrcDiffVerbose(masterAndResourceTrns(), txlib.getLocalTrnSourcePo())
		.then(pushSrcDiff);
};

module.exports = {
	command: 'push',
	description: 'Push new TRN source content to transifex',
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
		if (argv.project === tfx.MASTER_RESOURCE) {
			return pushTxMaster();
		}

		if (argv.all) {
			console.log(chalk.blue('Pushing content to all_translations'));
			return txlib.updateTfxSrcAllTranslations().catch(error => {
				console.error('ERROR:', error);
				process.exit(1);
			});
		}

		// all other commands should not be run on master
		exitOnMaster();
		pushTrnSrc().catch(err => {
			console.error('ERROR:', err);
			process.exit(1);
		});
	},
};
