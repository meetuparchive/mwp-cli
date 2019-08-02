const fs = require('fs');
const os = require('os');
const path = require('path');

const chalk = require('chalk');
const dogapi = require('dogapi');

const TIMER_FILE = path.resolve(os.tmpdir(), '__mwp-timers.json');
const attribute = {
	aliases: ['a', 'tag'],
	demandOption: true,
	describe: 'The attribute (tag) to time',
};
const setCurrentTimes = current =>
	fs.writeFileSync(TIMER_FILE, JSON.stringify(current));
const getCurrentTimes = () => {
	if (!fs.existsSync(TIMER_FILE)) {
		setCurrentTimes({});
	}
	return require(TIMER_FILE);
};

// logging function to be called when all metrics are available
// You can find the API key here: https://app.datadoghq.com/account/settings#api
const logMetrics = (datadogApiKey, metrics) => {
	dogapi.initialize({ api_key: datadogApiKey });

	dogapi.metric.send_all(metrics, (err, results) => {
		if (err) {
			throw err;
		}
		console.log(results);
	});
};

module.exports = {
	command: 'time',
	description: 'record timing data',
	builder: yargs =>
		yargs
			.demandCommand()
			.command('start', 'record a start time', { attribute }, argv => {
				const current = getCurrentTimes();
				current[argv.attribute] = { start: new Date().getTime() };
				return setCurrentTimes(current);
			})
			.command('end', 'record an end time', { attribute }, argv => {
				const current = getCurrentTimes();
				const currentTime = current[argv.attribute];
				if (!currentTime) {
					throw new Error(`${argv.attribute} not started`);
				}
				currentTime.end = new Date().getTime();
				return setCurrentTimes(current);
			})
			.command(
				'track',
				'upload timing values',
				{
					type: {
						alias: 't',
						demandOption: true,
						describe: 'The New Relic custom event type name',
					},
					attributes: {
						describe:
							'the set of attributes to send with this record',
						type: 'array',
					},
					key: {
						describe: 'The Datadog API key',
						demandOption: true,
						default: process.env.DATADOG_API_KEY,
					},
					build: {
						describe: 'The build number',
						demandOption: false,
						default: process.env.TRAVIS_BUILD_NUMBER,
					},
					appName: {
						describe: 'The name of the app reporting data',
						default: process.env.NEW_RELIC_APP_NAME,
					},
				},
				argv => {
					const NOW = new Date().getTime() / 1000; // one timestamp in seconds for all reported metrics
					// create a record based on the requested attributes
					const current = getCurrentTimes();

					console.log(
						chalk.yellow('Elapsed time:')
					);

					const metrics = argv.attributes.map(attr => {
						if (!current[attr]) {
							throw new Error(`${attr} not started`);
						}
						if (!current[attr].end) {
							throw new Error(`${attr} not finished`);
						}
						const currentTime =
							current[attr].end -
							current[attr].start;

						console.log(
							chalk.yellow(`${argv.attributes}: ${currentTime/1000}`)
						);

						return {
							metric: `mwp.${argv.type}.time`,
							points: [[NOW, currentTime/1000]],
							tags: [`application:${argv.appName}`, `build:${argv.build}`, `attribute:${attr}`]
						};
					});

					logMetrics(argv.key, metrics);
				}
			),
};
