const txlib = require('./index');

describe('trn utils', () => {
	it('compares two objects, returning an object composed of new keys or existing keys with changed msgstr values', () => {
		const same = { msgstr: 'same' };
		const different = { msgstr: 'abc' };
		const newEntry = { msgstr: 'new' };

		const mock = [
			{
				same,
				different: { msgstr: '123' },
			},
			{
				same,
				different,
				newEntry,
			},
		];

		const expected = {
			different,
			newEntry,
		};

		expect(txlib.diff(mock)).toEqual(expected);
	});

	it('wraps Po objects', () => {
		const trnObjs = [{}, {}];
		expect(txlib.wrapPoTrns(trnObjs)).toMatchSnapshot();
	});

	it('convert react-intl style objects into po style objects', () => {
		const trnObjs = [
			{
				id: 'id1',
				defaultMessage: 'id1 text',
				description: { text: 'text for test', jira: 'MW-001' },
				file: 'text.txt',
				start: { line: 2, column: 5 },
			},
			{
				id: 'id2',
				defaultMessage: 'id2 text',
				description: { text: 'text for test v2', jira: 'MW-002' },
				file: 'text2.txt',
				start: { line: 10, column: 10 },
			},
		];

		expect(txlib.reactIntlToPo(trnObjs)).toMatchSnapshot();
	});

	it('merge objects, throw error if dupe key', () => {
		const msg1 = {
			id1: {
				msgid: 'id1',
				msgstr: ['id1 text'],
				comments: {
					extracted: 'text for test',
					reference: 'text.txt:2:5',
				},
			},
		};
		const msg2 = {
			id2: {
				msgid: 'id2',
				msgstr: ['id2 text'],
				comments: {
					extracted: 'text for test v2',
					reference: 'text2.txt:10:10',
				},
			},
		};

		// expected success
		expect(txlib.mergeLocalTrns([msg1, msg2])).toMatchSnapshot();
		// expected error from duplicate msgs
		expect(() => txlib.mergeLocalTrns([msg1, msg1])).toThrow();
	});
});
