const chalk = require('chalk');
const webpack = require('webpack');
const vendorBundlesConfig = require('./configs/vendorBundlesConfig');

module.exports = {
	command: 'vendor',
	description: 'build the vendor (DLL) bundles',
	handler: argv => {
		console.log(chalk.blue('building vendor bundles...\n\n'));

		webpack(vendorBundlesConfig, (err, stats) => {
			// handle fatal webpack errors (wrong configuration, etc.)
			if (err) {
				console.error(chalk.red('vendor bundle webpack error:'));
				console.error(err);
				process.exit(1);
			}

			const info = stats.toJson();

			// handle compilation errors (missing modules, syntax errors, etc)
			if (stats.hasErrors()) {
				console.log(chalk.red('vendor bundle compilation error'));
				console.error(info.errors);
				process.exit(1);
			}

			// handle compilation warnings
			if (stats.hasWarnings()) {
				console.log(chalk.red('vendor bundle compilation warning:'));
				console.info(info.warnings);
			}

			// get filename determined by webpack output.filename
			const filemap = info.assetsByChunkName;

			console.log(
				chalk.blue(
					`built vendor bundles: ${chalk.yellow(
						Object.keys(filemap).join(', ')
					)}`
				)
			);
		});
	},
};
