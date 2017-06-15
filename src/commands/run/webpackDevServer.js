const fs = require('fs');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const { getBrowserAppConfig } = require('../../util/buildUtils');
const buildConfig = require('meetup-web-platform/lib/util/config/build')
	.default;

const { settings } = require('../../util/buildUtils');

const localeCodes = ['en-US']; // TODO read locales from yargs
const configs = localeCodes.map(getBrowserAppConfig);
const compiler = webpack(configs);
if (process.send) {
	// we are in a child process. communicate with parent through `process.send`
	compiler.plugin('done', stats => process.send('done'));
}

const options = {
	overlay: true, // show errors in the browser window
	hot: true,
	https: buildConfig.asset_server.protocol === 'https',
	stats: 'minimal', // only log errors/warnings/completion
	publicPath: `//${buildConfig.asset_server.host}:${buildConfig.asset_server
		.port}${buildConfig.asset_server.path}/`,
	disableHostCheck: true, // can be accessed by any network request
	headers: {
		'Access-Control-Allow-Origin': '*', // will respond to any host
	},
};

if (options.https) {
	options.key = fs.readFileSync(buildConfig.asset_server.key_file);
	options.cert = fs.readFileSync(buildConfig.asset_server.crt_file);
}

if (configs.length === 1) {
	// WDS won't respect config's publicPath when only 1 config is set
	// so we need to force it in the `options`
	options.publicPath = `${buildConfig.asset_server.path}/${localeCodes[0]}/`;
}

const server = new WebpackDevServer(compiler, options);

server.listen(buildConfig.asset_server.port, buildConfig.asset_server.host);
