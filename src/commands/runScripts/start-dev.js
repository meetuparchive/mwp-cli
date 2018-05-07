const fs = require('fs');
const fork = require('child_process').fork;
const path = require('path');
const chalk = require('chalk');
const webpack = require('webpack');
const { package: packageConfig } = require('mwp-config');

const getServerAppConfig = require('../buildCommands/configs/serverAppConfig');

const ready = {
	browserApp: false,
	serverApp: false,
	appServer: false,
};

let appServerProcess;

const log = (...msgs) => console.log(chalk.yellow('>>'), ...msgs);

// string utility to clean up file paths in error output - it removes the
// current working directory path, leaving just the project-root-relative path.
const replaceCwd = s => s.replace(new RegExp(`${process.cwd()}/`, 'g'), '');

// the full error output is too verbose - lines 0, 1, 5, 6 are most interesting
const errorLogLines = lines => [...lines.slice(0, 2), ...lines.slice(5, 7)];

const getCompileLogger = type => (err, stats) => {
	// handle fatal webpack errors (wrong configuration, etc.)
	if (err) {
		console.error(
			chalk.red('webpack error:')
		);
		console.error(err);
		process.exit(1);
	}

	const info = stats.toJson();

	// handle compilation errors (missing modules, syntax errors, etc)
	if (stats.hasErrors()) {
		info.errors
			.map(x => x.split('\n'))
			.map(errorLogLines)
			.map(lines => lines.join('\n   '))
			.map(replaceCwd)
			.map(x => chalk.red(x))
			.forEach(x => log(x));

		process.exit(1);
	}

	if (stats.hasWarnings()) {
		console.log(
			chalk.red('vendor bundle compilation warning:')
		);
		console.info(info.warnings);
	};

	const message = ready[type]
		? chalk.blue(`${type} updated`)
		: chalk.green(`${type} bundle built`);

	log(message);
};

function getSubdomain(packageConfig) {
	const { subdomain } = packageConfig;
	if (!subdomain) {
		throw new Error(
			chalk.red('You must supply config.subdomain in package.json')
		);
	}
	return subdomain;
}

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
	const args = [];
	if (!appServerProcess) {
		args.push('--cold-start');
		args.push(`--host=${getSubdomain(packageConfig)}.dev.meetup.com`);
	}
	appServerProcess = fork(path.resolve(__dirname, '_app-server'), args);
	ready.appServer = true;
};

function run() {
	const scriptName = path.basename(__filename, path.extname(__filename));
	log(chalk.blue(`${scriptName}: Preparing the Dev App Server using existing vendor bundle...`));

	/**
	 * 1. Start the Webpack Dev Server for the Browser application bundle
	 */
	const browserAppCompileLogger = getCompileLogger('browserApp');
	const wdsProcess = fork(path.resolve(__dirname, '_webpack-dev-server'));

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

	/**
	 * 2. Start the Webpack watch-mode compiler for the Server application
	 *
	 * no need to check for errors/warnings in the stats because this build
	 * parallels the one done in the Webpack Dev Server, and WDS will print
	 * error messages whenever there is something wrong.
	 */
	const serverAppCompileLogger = getCompileLogger('serverApp');
	const serverAppCompiler = webpack(getServerAppConfig('combined'));

	serverAppCompiler.watch(
		{
			aggregateTimeout: 100,
			ignored: /build/,
		}, // watch options
		(err, stats) => {
			serverAppCompileLogger(err, stats);

			if (
				stats.hasErrors() &&
				stats.toJson().errors[0].includes('trns/app/')
			) {
				log(
					`Try running '${chalk.yellow('yarn start:full')}'`,
					'- if that fails, check error output for typos'
				);
				wdsProcess.kill();
				if (appServerProcess) {
					appServerProcess.kill();
				}
				process.exit(1);
			}

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
	fs.watchFile(`${process.cwd()}/scripts/app-server.js`, () => startServer());
	fs.watchFile(
		`${process.cwd()}/node_modules/mwp-app-server/lib/index.js`,
		() => startServer()
	);
}

module.exports = run;

if (!module.parent) {
	run();
}
