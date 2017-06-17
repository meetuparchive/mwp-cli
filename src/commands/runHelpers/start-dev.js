const fs = require('fs');
const fork = require('child_process').fork;
const path = require('path');

const chalk = require('chalk');
const webpack = require('webpack');

const {
	getServerAppConfig,
	settings,
} = require('../buildCommands/config/buildUtils');

const serverAppLang = settings.localeCodes[0]; // top of the preferred lang list
const serverAppPath = `${process.cwd()}/build/server-app/${serverAppLang}/server-app`;
const ready = {
	browserApp: false,
	serverApp: false,
	appServer: false,
};
let appServerProcess;

const log = message => console.log(chalk.yellow('>>'), message);

const getCompileLogger = type => (err, stats) => {
	const message = ready[type]
		? chalk.blue(`${type} updated`)
		: chalk.green(`${type} bundle built`);
	log(message);
};

/*
 * Start a new server child process
 *
 * This function assumes that the server app corresponding to
 * serverAppLang will be available at serverAppPath when
 * `reader.serverApp` is true
 */
const startServer = () => {
	if (appServerProcess) {
		appServerProcess.kill();
		ready.appServer = false;
	}
	// Ignore the call if the serverApp is not ready
	if (!ready.serverApp || !ready.browserApp) {
		return;
	}
	const args = [`--${serverAppLang}=${serverAppPath}`];
	if (!appServerProcess) {
		args.push('--cold-start');
	}
	appServerProcess = fork(path.resolve(__dirname, '_start-dev-server'), args);
	ready.appServer = true;
};

function run() {
	/*
	 * 1. Start the Webpack Dev Server for the Browser application bundle
	 */
	log(chalk.blue('building browser assets to memory'));
	const browserAppCompileLogger = getCompileLogger('browserApp');
	const wdsProcess = fork(path.resolve(__dirname, 'webpackDevServer'), [
		serverAppLang,
	]);
	// the dev server compiler will send a message each time it completes a build
	wdsProcess.on('message', message => {
		browserAppCompileLogger();
		if (!ready.browerApp) {
			// this is the first build - we can attempt to start the app server.
			// no need to restart the server otherwise
			ready.browserApp = true;
			startServer();
		}
	});

	/*
	 * 2. Start the Webpack watch-mode compiler for the Server application
	 *
	 * no need to check for errors/warnings in the stats because this build
	 * parallels the one done in the Webpack Dev Server, and WDS will print
	 * error messages whenever there is something wrong.
	 */
	log(
		chalk.blue(
			`building server rendering bundle to ${settings.serverAppOutputPath}`
		)
	);
	const serverAppCompileLogger = getCompileLogger('serverApp');
	const serverAppCompiler = webpack(getServerAppConfig('en-US'));
	serverAppCompiler.watch(
		{
			aggregateTimeout: 100,
			ignored: /build/,
		}, // watch options
		(err, stats) => {
			if (
				stats.hasErrors() &&
				stats.toJson().errors[0].includes('trns/app/')
			) {
				console.error(chalk.red('Missing translated TRN modules'));
				console.warn(
					chalk.yellow('Try running `yarn build:trnModules` first')
				);
				wdsProcess.kill();
				if (appServerProcess) {
					appServerProcess.kill();
				}
				process.exit(1);
			}
			serverAppCompileLogger(err, stats);

			if (err) {
				throw err;
			}
			ready.serverApp = true;
			// 4. (Re)start the Node app server when Server application is (re)-built
			startServer();
		}
	);

	/*
	 * 3. watch for server dep changes in order to restart
	 */
	fs.watchFile(`${process.cwd()}/scripts/app-server.js`, startServer);
	fs.watchFile(
		`${process.cwd()}/node_modules/meetup-web-platform/lib/index.js`,
		startServer
	);
}

module.exports = run;

if (!module.parent) {
	run();
}
