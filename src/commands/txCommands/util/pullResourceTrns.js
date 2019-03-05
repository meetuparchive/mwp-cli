const fs = require('fs');
const path = require('path');
const { paths } = require('mwp-config');
const txlib = require('./index');
const tfx = require('./transifex');

const PO_DIR = path.resolve(paths.repoRoot, 'src/trns/po/');

// Merge remote translated PO content into local content /src/trns directory
const pullResourceContent = (branch, poDir = PO_DIR) =>
	Promise.all(
		// 1. load local trn content [ lang_tag, content ]
		txlib.getAllLocalPoContent().map(([lang_tag, localContent]) =>
			// 2. download updates
			tfx.resource.pullLang(branch, lang_tag).then(remoteContent => {
				// 3. write po files with updates merged into existing localContent
				const poContent = txlib.poObjToPoString(
					Object.assign(localContent, remoteContent)
				);
				const filepath = path.resolve(PO_DIR, `${lang_tag}.po`);
				fs.writeFileSync(filepath, poContent);
				process.stdout.write(`${lang_tag},`); // incrementally write one-line log
			})
		)
	).then(() => process.stdout.write('\n'));

module.exports = {
	pullResourceContent,
};
