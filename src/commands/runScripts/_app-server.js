const path = require('path');
const yargs = require('yargs');

const { locales, paths } = require('mwp-config');
const openBrowser = require('react-dev-utils/openBrowser');
const runServer = require(`${process.cwd()}/scripts/app-server`); // TODO: move this script into CLI - currently requires MWP dependency :/

/*
 * This script should generally _NOT_ be run directly - it is intended to run
 * as a child process of scripts/start-dev.js
 *
 * Start a dev server using server app bundles specified by command line args,
 * e.g.
 *
 * ```
 * $ node scripts/_start-dev-server.js --en-US=../build/server-app/en-US/server-app.js
 * ```
 */

/*
 * Parse the CLI args to return a map of { [localeCode]: string<import path> }
 * in addition to the 'cold start' config args
 */
const { argv } = yargs.implies('cold-start', 'host');

const getServerAppMap = () => {
	const renderer = require(path.resolve(
		paths.output.server,
		'combined',
		'server-app'
	)).default;

	return locales.reduce((map, localeCode) => {
		map[localeCode] = renderer;
		return map;
	}, {});
};

function startDevServer() {
	return runServer(getServerAppMap());
}

/*
 * Synchronously run the `startDevServer` function, and open the dev site in the
 * browser if this is a 'coldStart', i.e. this is the first start of the server,
 * not a 'watched' restart
 */
startDevServer().then(server => {
	// if this is a cold start, open the browser
	if (argv.coldStart) {
		const { protocol, port } = server.settings.app.app_server;
		openBrowser(`${protocol}://${argv.host}:${port}`);
	}
	return server;
});

module.exports = startDevServer;
