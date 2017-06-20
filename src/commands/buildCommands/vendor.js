const chalk = require('chalk');
const webpack = require('webpack');

const { vendorBundlesConfig } = require('./config');

module.exports = {
	command: 'vendor',
	description: 'build the vendor (DLL) bundles',
	builder: yargs => yargs,
	handler: argv => {
		console.log(chalk.blue('building vendor bundles...'));
		webpack(vendorBundlesConfig, (err, stats) => {
			// get filename determined by webpack output.filename
			const filemap = stats.toJson().assetsByChunkName;
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
