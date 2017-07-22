const fs = require('fs');
const fork = require('child_process').fork;
const path = require('path');

const chalk = require('chalk');
const webpack = require('webpack');

const {
	locales,
	paths,
	package: packageConfig,
	webpack: { getServerAppConfig },
} = require('../../config');

const ready = {
	browserApp: false,
	serverApp: false,
	appServer: false,
};
let appServerProcess;

const log = (...msgs) => console.log(chalk.yellow('>>'), ...msgs);

// regex to find all instances of the current working directory as a string
const cwd = new RegExp(`${process.cwd()}/`, 'g');
const replaceCwd = s => s.replace(cwd, '');

// the full error output is too verbose - lines 0, 1, 5, 6 are most interesting
const errorLogLines = lines => [...lines.slice(0, 2), ...lines.slice(5, 7)];

const getCompileLogger = type => (err, stats) => {
	if (stats && stats.hasErrors()) {
		stats
			.toJson()
			.errors.map(x => x.split('\n'))
			.map(errorLogLines)
			.map(lines => lines.join('\n   '))
			.map(replaceCwd)
			.map(x => chalk.red(x))
			.forEach(x => log(x));
	}
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

const getServerAppArgs = locales => {
	return locales.map(locale => {
		const serverAppPath = path.resolve(
			paths.output.server,
			locale,
			'server-app'
		);
		return `--${locale}=${serverAppPath}`;
	});
};
/*
 * Start a new server child process
 *
 * This function assumes that the server app corresponding to
 * serverAppLang will be available at serverAppPath when
 * `reader.serverApp` is true
 */
const startServer = locales => {
	if (appServerProcess) {
		appServerProcess.kill();
		ready.appServer = false;
	}
	// Ignore the call if the serverApp is not ready
	if (!ready.serverApp || !ready.browserApp) {
		return;
	}
	const args = getServerAppArgs(locales);
	if (!appServerProcess) {
		args.push('--cold-start');
		args.push(`--host=${getSubdomain(packageConfig)}.dev.meetup.com`);
	}
	appServerProcess = fork(path.resolve(__dirname, '_app-server'), args);
	ready.appServer = true;
};

function run(locales) {
	log(chalk.blue('building app, using existing vendor bundle'));
	/*
	 * 1. Start the Webpack Dev Server for the Browser application bundle
	 */
	log(chalk.blue('building browser assets to memory'));
	const browserAppCompileLogger = getCompileLogger('browserApp');
	const wdsProcess = fork(path.resolve(__dirname, '_webpack-dev-server'), [
		'--locales',
		...locales,
	]);
	// the dev server compiler will send a message each time it completes a build
	wdsProcess.on('message', message => {
		browserAppCompileLogger();
		if (!ready.browerApp) {
			// this is the first build - we can attempt to start the app server.
			// no need to restart the server otherwise
			ready.browserApp = true;
			startServer(locales);
		}
	});

	/*
	 * 2. Start the Webpack watch-mode compiler for the Server application
	 *
	 * no need to check for errors/warnings in the stats because this build
	 * parallels the one done in the Webpack Dev Server, and WDS will print
	 * error messages whenever there is something wrong.
	 */
	log(chalk.blue(`building server rendering bundle to ${paths.output.server}`));
	const serverAppCompileLogger = getCompileLogger('serverApp');
	const serverAppCompiler = webpack(locales.map(getServerAppConfig));
	serverAppCompiler.watch(
		{
			aggregateTimeout: 100,
			ignored: /build/,
		}, // watch options
		(err, stats) => {
			serverAppCompileLogger(err, stats);

			if (stats.hasErrors() && stats.toJson().errors[0].includes('trns/app/')) {
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
			startServer(locales);
		}
	);

	/*
	 * 3. watch for server dep changes in order to restart
	 */
	fs.watchFile(`${process.cwd()}/scripts/app-server.js`, () =>
		startServer(locales)
	);
	fs.watchFile(
		`${process.cwd()}/node_modules/meetup-web-platform/lib/index.js`,
		() => startServer(locales)
	);
}

module.exports = run;

if (!module.parent) {
	run();
}
