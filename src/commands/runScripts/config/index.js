const path = require('path');
const chalk = require('chalk');
const convict = require('convict');

const buildConfig = require('../../buildCommands/config');

function getSubdomain() {
	const appPackageConfig =
		require(path.resolve(buildConfig.paths.repoRoot, 'package.json'))
			.config || {};
	return appPackageConfig.subdomain;
}
const schema = {
	host: {
		validate: host => {
			if (host.startsWith('undefined')) {
				throw new Error(
					'You must supply config.subdomain in package.json'
				);
			}
		},
		format: String,
		default: `${getSubdomain()}.dev.meetup.com`,
	},
};

const config = convict(schema);
config.validate();

module.exports = {
	schema,
	config,
	properties: config.getProperties(),
};
