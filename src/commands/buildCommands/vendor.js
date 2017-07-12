const chalk = require('chalk');
const webpack = require('webpack');
const config = require('./config');

const { vendorBundlesConfig } = config.webpack;

module.exports = {
	command: 'vendor',
	description: 'build the vendor (DLL) bundles',
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
