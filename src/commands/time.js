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
		console.log(`logged [${metrics.map(m => m.metric)}] to DataDog`);
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
				const start = new Date().getTime();
				console.log(chalk.blue(`Start ${argv.attribute}: ${start}`));
				current[argv.attribute] = { start };
				return setCurrentTimes(current);
			})
			.command('end', 'record an end time', { attribute }, argv => {
				const current = getCurrentTimes();
				const currentTime = current[argv.attribute];
				if (!currentTime) {
					throw new Error(`${argv.attribute} not started`);
				}
				const end = new Date().getTime();
				console.log(chalk.blue(`End ${argv.attribute}: ${end}`));
				currentTime.end = end;
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
						describe: 'the set of attributes to send with this record',
						type: 'array',
					},
					key: {
						describe: 'The Datadog API key',
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

					const metric = `mwp.${argv.type}.time`;
					console.log(chalk.yellow(`⏱ logging ${metric}:`));

					const metrics = argv.attributes.map(attr => {
						if (!current[attr]) {
							throw new Error(`${attr} not started`);
						}
						if (!current[attr].end) {
							throw new Error(`${attr} not finished`);
						}
						const elapsedTime = current[attr].end - current[attr].start;
						const value = elapsedTime / 1000;
						const tags = [
							`application:${argv.appName}`,
							`build:${argv.build}`,
							`attribute:${attr}`,
						];
						console.log(chalk.yellow(`${attr}: ${value}`));

						return {
							metric,
							points: [[NOW, value]],
							tags,
						};
					});

					if (argv.key) {
						logMetrics(argv.key, metrics);
					}
				}
			),
};
