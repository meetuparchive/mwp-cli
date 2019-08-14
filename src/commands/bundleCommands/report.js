const reportUtils = require('../buildUtils/reportUtils');
const dogapi = require('dogapi');

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
	command: 'report',
	description: 'log build statistics (stats.json)',
	builder: yargs =>
		yargs.options({
			application: {
				demandOption: true,
				default: process.env.NEW_RELIC_APP_NAME,
				describe: 'application name that will be used to tag the data',
			},
			build: {
				default: process.env.TRAVIS_BUILD_NUMBER,
				demandOption: true,
				describe: 'The build ID that will be used to tag the data',
			},
			key: {
				describe: 'The Datadog API key',
				demandOption: true,
				default: process.env.DATADOG_API_KEY,
			},
		}),
	handler: argv => {
		reportUtils
			.getMetrics(argv.application, argv.build)
			.then(metrics => logMetrics(argv.key, metrics))
			.catch(err => {
				console.log(err);
				// exit gracefully - failure to track should not block anything else
				process.exit();
			});
	},
};
