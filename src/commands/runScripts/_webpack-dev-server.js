const fs = require('fs');
const webpack = require('webpack');
const yargs = require('yargs');
const WebpackDevServer = require('webpack-dev-server');
const {
	env,
	webpack: { getBrowserAppConfig },
} = require('../buildCommands/config');

// Set up webpack multicompiler - one for each localeCode specified in CLI args
const localeCodes = yargs
	.array('locales') // treat locales as array, always
	.option('locales')
	.demandOption('locales').argv.locales;
const configs = localeCodes.map(getBrowserAppConfig);
const compiler = webpack(configs);
if (process.send) {
	// we are in a child process. communicate with parent through `process.send`
	compiler.plugin('done', stats => process.send('done'));
}

const options = {
	overlay: true, // show errors in the browser window
	hot: true,
	https: env.properties.asset_server.protocol === 'https',
	stats: 'minimal', // only log errors/warnings/completion
	publicPath: `//${env.properties.asset_server.host}:${env.properties
		.asset_server.port}${env.properties.asset_server.path}/`,
	disableHostCheck: true, // can be accessed by any network request
	headers: {
		'Access-Control-Allow-Origin': '*', // will respond to any host
	},
};

if (options.https) {
	options.key = fs.readFileSync(env.properties.asset_server.key_file);
	options.cert = fs.readFileSync(env.properties.asset_server.crt_file);
}

if (configs.length === 1) {
	// WDS won't respect config's publicPath when only 1 config is set
	// so we need to force it in the `options`
	options.publicPath = `${env.properties.asset_server.path}/${localeCodes[0]}/`;
}

const server = new WebpackDevServer(compiler, options);

server.listen(
	env.properties.asset_server.port,
	env.properties.asset_server.host
);
