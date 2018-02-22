const fs = require('fs');
const os = require('os');
const path = require('path');

const Insights = require('node-insights');

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

module.exports = {
	command: 'time',
	description: 'record timing data',
	builder: yargs =>
		yargs
			.demandCommand()
			.command('start', 'record a start time', { attribute }, argv => {
				const current = getCurrentTimes();
				if (current[argv.attribute]) {
					throw new Error(
						`${argv.attribute} already started at ${argv.attribute
							.start}`
					);
				}
				current[argv.attribute] = { start: new Date().getTime() };
				return setCurrentTimes(current);
			})
			.command('end', 'record an end time', { attribute }, argv => {
				const current = getCurrentTimes();
				const currentTime = current[argv.attribute];
				if (!currentTime) {
					throw new Error(`${argv.attribute} not started`);
				}
				if (currentTime.end) {
					throw new Error(
						`${argv.attribute} already ended at`,
						new Date(currentTime.end)
					);
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
						describe: 'The record type',
					},
					attributes: {
						describe:
							'the set of attributes to send with this record',
						type: 'array',
					},
					accountId: {
						alias: 'id',
						describe: 'The New Relic account ID',
						demandOption: true,
						default: process.env.NEW_RELIC_ACCOUNT_ID,
					},
					key: {
						describe: 'The New Relic API insert key',
						demandOption: true,
						default: process.env.NEW_RELIC_INSERT_KEY,
					},
				},
				argv => {
					// create a record based on the requested attributes
					const current = getCurrentTimes();
					const record = argv.attributes.reduce((acc, attribute) => {
						if (!current[attribute]) {
							throw new Error(`${attribute} not started`);
						}
						if (!current[attribute].end) {
							throw new Error(`${attribute} not finished`);
						}
						const currentTime =
							current[attribute].end - current[attribute].start;
						acc[attribute] = currentTime / 1000; // report in seconds
						return acc;
					}, {});

					// initialize the New Relic Insights API
					const track = new Insights({
						insertKey: argv.key,
						accountId: argv.accountId,
						defaultEventType: argv.type,
					});
					track.add(record);
					track.finish();
				}
			),
};
