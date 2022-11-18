const chalk = require('chalk');
const txlib = require('./util');
const tfx = require('./util/transifex');

const pushTxMaster = require('./util/pushTxMaster');
const { gitBranch, exitOnMaster } = require('./util/gitHelpers');
const { version3 } = require('./util/constants');
const utilsV3 = require('./util/utilsV3');
const { TransifexApi } = require('./util/transifexApi');

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
	});
};
// syncs content in po format to Transifex
const pushSrcDiffV3 = poData => {
	const branch = gitBranch();
	return TransifexApi.isResourceExists(branch).then(async branchResourceExists => {
		if (Object.keys(poData).length) {
			console.log(chalk.blue('Pushing new source content to Transifex'));
			console.log('keys:', Object.keys(poData).join(', '));
			console.log(branchResourceExists ? 'Updating' : 'Creating', 'resource');
			if (!branchResourceExists) {
				await TransifexApi.createResource(branch);
			}

			return TransifexApi.uploadsResourceStrings(branch, poData);
		}
		// If there's no translation `po` data but the branch resource exists in Transifex,
		// delete it from Transifex
		if (branchResourceExists) {
			return TransifexApi.deleteResource(branch).then(() =>
				console.log(
					'Local branch trn data is empty',
					` - deleted ${TransifexApi.PROJECT}/${branch}`
				)
			);
		}
	});
};

const masterAndResourceTrns = () =>
	Promise.all([
		tfx.resource.pullAll(tfx.MASTER_RESOURCE, tfx.PROJECT_MASTER),
		tfx.project.pullAll(resource => resource !== gitBranch()),
	]).then(([masterTrns, resourceTrns]) =>
		Object.assign({}, masterTrns, resourceTrns)
	);

const masterAndResourceTrnsv3 = () =>
	Promise.all([
		TransifexApi.getResourceStrings(
			TransifexApi.MASTER_RESOURCE,
			TransifexApi.PROJECT_MASTER
		),
		TransifexApi.getAllStrings(resource => resource !== gitBranch()),
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
const pushTrnSrcV3 = () => {
	return utilsV3
		.trnSrcDiffVerbose(masterAndResourceTrnsv3(), utilsV3.getLocalTrnSourcePo())
		.then(pushSrcDiffV3);
};

module.exports = {
	command: 'push',
	description: 'Push new TRN source content to transifex',
	builder: yarg =>
		yarg.option({
			project: {
				alias: 'p',
				default: tfx.PROJECT,
				type: 'string',
			},
			all: {
				alias: 'a',
				default: false,
				type: 'boolean',
			},
			version3,
		}),
	handler: argv => {
		if (argv.v3) {
			console.log(chalk.magenta('Using Transifex v3'));
			return pushUsingV3(argv);
		}

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

const pushUsingV3 = argv => {
	if (argv.project === tfx.MASTER_RESOURCE) {
		// todo is it still being used ? add logic : remove condition
		console.error('ERROR:', 'is it still being used ?');
		process.exit(1);
	}

	if (argv.all) {
		console.log(chalk.blue('Pushing content to all_translations'));
		return utilsV3.updateTfxSrcAllTranslations().catch(error => {
			console.error('ERROR:', error);
			process.exit(1);
		});
	}

	// all other commands should not be run on master
	exitOnMaster();
	pushTrnSrcV3().catch(err => {
		console.error('ERROR:', err);
		process.exit(1);
	});
};
