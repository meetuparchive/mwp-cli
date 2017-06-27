const chalk = require('chalk');
const fs = require('fs');
const Rx = require('rxjs');
const txlib = require('./lib');

const tx = txlib.tx;

const readTranslation$ = (branch, lang_tag) =>
	Rx.Observable
		.bindNodeCallback(tx.translationInstanceMethod.bind(tx))(
			txlib.PROJECT,
			branch,
			lang_tag
		)
		.map(response => response[0]);

const downloadTrnUpdates$ = (branch, language) =>
	readTranslation$(branch, language).flatMap(txlib.parsePluckTrns);



// Write the translated message source PO files into the /src/trns directory
// 1. load local trn content [ lang_tag, content ]
const pullResourceContent$ = branch => txlib.allLocalPoTrns$
	// 2. parse local trn content and grab updates
	.flatMap(([lang_tag, content]) =>
		Rx.Observable.zip(
			[lang_tag],
			txlib.parsePluckTrns(content),
			downloadTrnUpdates$(branch, lang_tag)
		)
	)
	// 3. merge new content over existing
	.map(([lang_tag, poContent, newContent]) => [
		lang_tag,
		Object.assign(poContent, newContent),
	])
	.flatMap(([lang_tag, mergedContent]) =>
		// 4. compile to po format
		txlib
			.wrapCompilePo$(mergedContent)
			.do(poContent => {
				// 5. save to PO files that can be transpiled to importable JSON
				fs.writeFileSync(`src/trns/po/${lang_tag}.po`, poContent);
			})
			.do(() => console.log(`${lang_tag} complete`))
	);

module.exports = {
	command: 'pull',
	description: 'pull resource content from transifex',
	builder : yarg => yarg.option({'resource': {
			alias:'r',
			demandOption: true,
			type: 'array',
		}}),
	handler: argv => {
		txlib.checkEnvVars();
		console.log(
			chalk.blue('pulling resource content from transifex')
		);

		argv.resource.forEach(resource => pullResourceContent$(resource)
				.subscribe(null, null, () => console.log(`${resource} done`))
			);
	},
};
