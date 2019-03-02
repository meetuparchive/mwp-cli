const fs = require('fs');
const path = require('path');
const { paths } = require('mwp-config');
const txlib = require('./index');
const tfx = require('./transifex');

const pullTranslations = (branch, lang_tag) =>
	tfx.api
		.translationInstanceMethod(
			branch == 'master' ? txlib.PROJECT_MASTER : txlib.PROJECT,
			branch,
			lang_tag
		)
		.then(txlib.poStringToPoObj);

// Write the translated message source PO files into the /src/trns directory
const pullResourceContent = branch =>
	Promise.all(
		// 1. load local trn content [ lang_tag, content ]
		txlib.getAllLocalPoContent().map(([lang_tag, localContent]) =>
			// 2. download updates
			pullTranslations(branch, lang_tag).then(remoteContent => {
				// 3. write po files with updates merged into existing localContent
				const poContent = txlib.poObjToPoString(
					Object.assign(localContent, remoteContent)
				);
				const filepath = path.resolve(
					paths.repoRoot,
					`src/trns/po/${lang_tag}.po`
				);
				fs.writeFileSync(filepath, poContent);
				process.stdout.write(`${lang_tag},`); // incrementally write one-line output
			})
		)
	).then(() => process.stdout.write('\n'));

module.exports = {
	pullResourceContent,
};
