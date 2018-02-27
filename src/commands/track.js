const fs = require('fs');
const os = require('os');
const path = require('path');

const chalk = require('chalk');
const Insights = require('node-insights');

const VALUE_FILE = path.resolve(os.tmpdir(), '__mwp-track-values.json');
const attribute = {
	aliases: ['a', 'tag'],
	demandOption: true,
	describe: 'The attribute (tag) to record a value for',
};

// Write values to the temp file - always overwrite the whole file
const setCurrentValues = current =>
	fs.writeFileSync(VALUE_FILE, JSON.stringify(current));

// Get stored values (write new file if none exists)
const getCurrentValues = () => {
	if (!fs.existsSync(VALUE_FILE)) {
		setCurrentValues({});
	}
	return require(VALUE_FILE);
};

/** COMMAND HANDLERS **/
// arbitrary key-value recording function
const handleRecord = argv => {
	const { attribute, value } = argv;
	const current = getCurrentValues();
	if (current[attribute] && current[attribute] !== value) {
		console.warn(
			chalk.yellow(`${attribute} was set to ${current[attribute]}`),
			chalk.yellow(`- overwriting to ${value}`)
		);
	}
	current[attribute] = value;
	setCurrentValues(current);
};

// start timer
const handleStart = argv => {
	const current = getCurrentValues();
	if (current[argv.attribute]) {
		throw new Error(
			`${argv.attribute} already started at ${argv.attribute.start}`
		);
	}
	current[argv.attribute] = { start: new Date().getTime() };
	return setCurrentValues(current);
};

// end timer
const handleEnd = argv => {
	const current = getCurrentValues();
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
	return setCurrentValues(current);
};

// send the data to New Relic
const handleSend = argv => {
	// create a record based on the requested attributes
	const current = getCurrentValues();
	// check that all requested attributes are in `current` and modify timers
	// to be a single time value
	const record = argv.attributes.reduce((acc, attribute) => {
		if (!current[attribute]) {
			throw new Error(`${attribute} not defined`);
		}
		if (current[attribute].start) {
			if (!current[attribute].end) {
				throw new Error(`${attribute} timing not finished`);
			}
			const currentTime =
				current[attribute].end - current[attribute].start;
			acc[attribute] = currentTime / 1000; // report in seconds
		}
		return acc;
	}, current);

	// initialize the New Relic Insights API
	const track = new Insights({
		insertKey: argv.key,
		accountId: argv.accountId,
		defaultEventType: argv.type,
	});
	track.add(record);
	track.finish();
};

module.exports = {
	command: 'track',
	description: 'record timing data',
	builder: yargs =>
		yargs
			.demandCommand()
			.command(
				'record',
				'record a value',
				{ attribute, value: { demandOption: true } },
				handleRecord
			)
			.command('start', 'record a start time', { attribute }, handleStart)
			.command('end', 'record an end time', { attribute }, handleEnd)
			.command(
				'send',
				'upload values',
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
				handleSend
			),
};
