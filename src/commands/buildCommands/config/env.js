const fs = require('fs');
const os = require('os');
const path = require('path');

const chalk = require('chalk');
const convict = require('convict');
const { argv } = require('yargs');

/**
 * This module populates build time configuration data
 */

const schema = {
	// asset server is needed for dev build in order to set up HMR server
	asset_server: {
		host: {
			format: String,
			default: 'beta2.dev.meetup.com',
			env: 'ASSET_SERVER_HOST',
		},
		path: {
			format: String,
			default: '/static',
			env: 'ASSET_PATH',
		},
		port: {
			format: 'port',
			default: 8001, // must be 443 for prod
			arg: 'asset-port',
			env: process.env.NODE_ENV !== 'test' && 'ASSET_SERVER_PORT', // don't read env in tests
		},
		protocol: {
			format: String,
			default: process.env.NODE_ENV === 'production'
				? 'http' // SSL handled by load balancer
				: 'https',
			env: 'ASSET_SERVER_PROTOCOL',
		},
		key_file: {
			format: String,
			default: path.resolve(
				os.homedir(),
				'.certs',
				'star.dev.meetup.com.key'
			),
			env: 'ASSET_KEY_FILE',
		},
		crt_file: {
			format: String,
			default: path.resolve(
				os.homedir(),
				'.certs',
				'star.dev.meetup.com.crt'
			),
			env: 'ASSET_CRT_FILE',
		},
	},
	env: {
		format: ['production', 'development', 'test'],
		default: 'development',
		env: 'NODE_ENV',
	},
	disable_hmr: {
		format: Boolean,
		default: false,
		env: 'DISABLE_HMR',
	},
	isDev: {
		format: Boolean,
		default: true,
	},
	isProd: {
		format: Boolean,
		default: false,
	},
};
const config = convict(schema);

const configPath = path.resolve(
	process.cwd(),
	`config.${config.get('env')}.json`
);

const { asset_server } = fs.existsSync(configPath) ? require(configPath) : {};
if (asset_server) {
	config.load({ asset_server });
}

config.set('isProd', config.get('env') === 'production');
config.set('isDev', config.get('env') === 'development');

const assetConf = config.get('asset_server');

if (
	assetConf.protocol === 'https' &&
	(!fs.existsSync(assetConf.key_file) || !fs.existsSync(assetConf.crt_file))
) {
	const message = 'Missing HTTPS cert or key for asset server!';
	if (config.isProd) {
		throw new Error(message);
	}
	console.error(chalk.red(message));
	console.warn(
		chalk.yellow(
			'Re-setting protocol to HTTP - some features may not work as expected'
		)
	);
	console.warn(chalk.yellow('See MWP config docs to configure HTTPS'));
	config.set('asset_server.protocol', 'http');
}

config.validate();

module.exports = {
	schema,
	config,
	properties: config.getProperties(),
};
