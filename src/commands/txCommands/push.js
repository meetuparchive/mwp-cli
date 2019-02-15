const chalk = require('chalk');
const Rx = require('rxjs');
require('rxjs/add/observable/zip');
require('rxjs/add/observable/if');
require('rxjs/add/operator/mergeMap');
require('rxjs/add/operator/map');
require('rxjs/add/operator/do');
const txlib = require('./util');

const pushTxMaster = require('./util/pushTxMaster');
const pushTxAllTranslations = require('./util/pushTxAllTranslations');
const { gitBranch$ } = require('./util/gitHelpers');
const checkNotMaster$ = require('./util/checkNotMaster');

const readParseResource$ = slug =>
	txlib.readResource$(slug).mergeMap(txlib.parsePluckTrns);

const branchResourceExists$ = Rx.Observable.zip(
	txlib.resources$,
	gitBranch$
).map(([resources, branch]) => resources.indexOf(branch) > -1);

// syncs content in po format to tx
const pushResource$ = poData =>
	Rx.Observable.zip(gitBranch$, branchResourceExists$).mergeMap(
		([gitBranch, branchResourceExists]) => {
			if (Object.keys(poData).length) {
				console.log(
					'branch exists in transifex: ',
					branchResourceExists
				);
				console.log(
					'translation keys:',
					Object.keys(poData).join(', ')
				);
				const pushed$ = branchResourceExists
					? txlib.updateResource$
					: txlib.createResource$;
				return pushed$(gitBranch, poData);
			} else {
				return Rx.Observable.if(
					() => branchResourceExists,
					txlib
						.deleteResource$(gitBranch)
						.do(() =>
							console.log(`no new content - delete ${gitBranch}`)
						)
				);
			}
		}
	);

// returns 'master' content trn from tx in po format
const txMasterTrns$ = txlib
	.readResource$(txlib.MASTER_RESOURCE, txlib.PROJECT_MASTER)
	.mergeMap(txlib.parsePluckTrns);

const resourceTrns$ = Rx.Observable.zip(gitBranch$, txlib.resources$)
	// get resources but filter out my current resource
	.map(([gitBranch, resources]) =>
		resources.filter(resource => resource != gitBranch)
	)
	// transform resource list to resource content, maintaining order
	.mergeMap(resources =>
		Rx.Observable.zip.apply({}, resources.map(readParseResource$))
	)
	.reduce(
		(joinedTrns, resourceTrns) => Object.assign(joinedTrns, resourceTrns),
		{}
	);

const masterAndResourceTrns$ = Rx.Observable.zip(
	txMasterTrns$,
	resourceTrns$
).map(([masterTrns, resourceTrns]) =>
	Object.assign({}, masterTrns, resourceTrns)
);

const pushContent$ = txlib
	.diffVerbose$(masterAndResourceTrns$, txlib.localTrnsMerged$)
	.mergeMap(pushResource$);

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
		txlib.checkEnvVars();

		if (argv.project === txlib.MASTER_RESOURCE) {
			return pushTxMaster();
		}

		if (argv.all) {
			return pushTxAllTranslations();
		}

		checkNotMaster$.subscribe();

		console.log(chalk.blue('pushing content to transifex'));
		pushContent$.subscribe(
			null,
			error => {
				console.error(`encountered error during push: ${error}`);
				process.exit(1);
			},
			() => console.log(`content pushed`)
		);
	},
};
