const chalk = require('chalk');
const child_process = require('child_process');
const Rx = require('rxjs');
const txlib = require('./util');

const tx = txlib.tx;

const { pushTxMaster } = require('./pushTxMaster');
const { pushTxAllTranslations } = require('./pushTxAllTranslations');

const readParseResource$ = slug =>
	txlib.readResource$(slug).flatMap(txlib.parsePluckTrns);

const devGitBranch$ = Rx.Observable.bindNodeCallback(child_process.exec)(
	'git rev-parse --abbrev-ref HEAD'
)
	.pluck(0)
	.map(str => str.slice(0, -1));

// Branch whether in dev or CI. Replaces forward slashes because
// branch names are used as transifex resource names and resource
// names need to work as valid url paths
const gitBranch$ = Rx.Observable
	.if(
	() => process.env.TRAVIS_PULL_REQUEST_BRANCH,
	Rx.Observable.of(process.env.TRAVIS_PULL_REQUEST_BRANCH),
	devGitBranch$
	)
	.map(branchname => branchname.replace(/\//g, '_'));

const branchResourceExists$ = Rx.Observable
	.zip(txlib.resources$, gitBranch$)
	.map(([resources, branch]) => resources.indexOf(branch) > -1);

// syncs content in po format to tx
const pushResource$ = poData =>
	Rx.Observable
		.zip(gitBranch$, branchResourceExists$)
		.flatMap(([gitBranch, branchResourceExists]) => {
			if (Object.keys(poData).length) {
				const pushed$ = branchResourceExists
					? txlib.updateResource$
					: txlib.createResource$;
				return pushed$(gitBranch, poData);
			} else {
				return Rx.Observable.if(
					() => branchResourceExists,
					txlib.deleteResource$(gitBranch)
						.do(() => console.log(`no new content - delete ${gitBranch}`))
				);
			}
		});

// returns 'master' content trn from tx in po format
const txMasterTrns$ = txlib
	.readResource$(txlib.MASTER_RESOURCE, txlib.PROJECT_MASTER)
	.flatMap(txlib.parsePluckTrns);

const resourceTrns$ = Rx.Observable
	.zip(gitBranch$, txlib.resources$)
	// get resources but filter out my current resource
	.map(([gitBranch, resources]) =>
		resources.filter(resource => resource != gitBranch)
	)
	// transform resource list to resource content, maintaining order
	.flatMap(resources =>
		Rx.Observable.zip.apply({}, resources.map(readParseResource$))
	)
	.reduce(
	(joinedTrns, resourceTrns) => Object.assign(joinedTrns, resourceTrns),
	{}
	);

const masterAndResourceTrns$ = Rx.Observable
	.zip(txMasterTrns$, resourceTrns$)
	.map(([masterTrns, resourceTrns]) =>
		Object.assign({}, masterTrns, resourceTrns)
	);

// don't run against master! will delete trn content on transifex
const branchCheck$ = gitBranch$.do(branchName => {
	if (branchName === 'master') {
		console.log(
			'do not run this script on master. it will kill the master resource on Transifex.'
		);
		process.exit(0);
	}
});

const pushContent$ = txlib.diffVerbose$(masterAndResourceTrns$, txlib.localTrnsMerged$)
	.flatMap(pushResource$);

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
			}
		}),
	handler: argv => {
		txlib.checkEnvVars();

		if (argv.project === txlib.MASTER_RESOURCE) {
			return pushTxMaster();
		}

		if (argv.all) {
			return pushTxAllTranslations();
		}

		branchCheck$.subscribe();

		console.log(chalk.blue('pushing content to transifex'));

		pushContent$.subscribe(null, null, () => console.log(`content pushed`));
	},
};