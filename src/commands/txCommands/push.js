const chalk = require('chalk');
const txlib = require('./util');

const pushTxMaster = require('./util/pushTxMaster');
const pushTxAllTranslations = require('./util/pushTxAllTranslations');
const { gitBranch, exitOnMaster } = require('./util/gitHelpers');

const readParseResource = slug =>
	txlib.readTfxResource(slug).then(txlib.poStringToPoObj);

// Check if transifex resource exists for the supplied git branch name,
// defaulting to checking currently-checked-out branch
const checkTfxResourceExists = (branch = gitBranch()) =>
	txlib.getTfxResources().then(resources => resources.indexOf(branch) > -1);

// syncs content in po format to tx
const pushResource = poData =>
	checkTfxResourceExists().then(branchResourceExists => {
		const branch = gitBranch();
		if (Object.keys(poData).length) {
			console.log('translation keys:', Object.keys(poData).join(', '));
			console.log(
				branchResourceExists ? 'Updating' : 'Creating',
				'resource'
			);
			const push = branchResourceExists
				? txlib.updateTfxResource
				: txlib.createTfxResource;
			return push(branch, poData);
		}
		// If there's no translation `po` data but the branch resource exists (in transifex), delete it from transifex
		if (branchResourceExists) {
			return txlib
				.deleteTxResource(branch)
				.then(() =>
					console.log(
						`Local branch trn data is empty - delete ${branch}`
					)
				);
		}
		return; // no data, no branch, no problem
	});

const getTfxResourceTrns = () =>
	txlib
		.getTfxResources()
		// get resources but filter out my current resource
		.then(resources => {
			const branch = gitBranch();
			return resources.filter(resource => resource !== branch);
		})
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
	Promise.all([txlib.getTfxMaster(), getTfxResourceTrns()]).then(
		([masterTrns, resourceTrns]) =>
			Object.assign({}, masterTrns, resourceTrns)
	);

const pushContent = () => {
	console.log(chalk.blue('pushing content to transifex'));
	return txlib
		.diffVerbose(masterAndResourceTrns(), txlib.getLocalTrnSourcePo())
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

		exitOnMaster();
		pushContent().catch(err => {
			console.error('Encountered error during push:', err);
			process.exit(1);
		});
	},
};
