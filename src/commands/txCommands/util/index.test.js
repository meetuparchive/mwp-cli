const txlib = require('./index');

describe('trn utils', () => {
	it('compares two objects, returning an object composed of new keys or existing keys with changed msgstr values', () => {
		const mock = [
			{
				same: { msgstr: 'same' },
				different: { msgstr: '123' },
			},
			{
				same: { msgstr: 'same' },
				different: { msgstr: 'abc' },
				new: { msgstr: 'new' },
			},
		];

		const expected = {
			different: { msgstr: 'abc' },
			new: { msgstr: 'new' },
		};

		expect(txlib.diff(mock)).toEqual(expected);
	});

	it('wraps Po objects', () => {
		const trnObjs = [{}, {}];
		const expected = {
			charset: 'utf-8',
			headers: {
				'content-type': 'text/plain; charset=utf-8',
			},
			translations: {
				'': [{}, {}],
			},
		};

		expect(txlib.wrapPoTrns(trnObjs)).toEqual(expected);
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

		const expected = {
			id1: {
				msgid: 'id1',
				msgstr: ['id1 text'],
				comments: {
					translator: 'MW-001',
					extracted: 'text for test',
					reference: 'text.txt:2:5',
				},
			},
			id2: {
				msgid: 'id2',
				msgstr: ['id2 text'],
				comments: {
					translator: 'MW-002',
					extracted: 'text for test v2',
					reference: 'text2.txt:10:10',
				},
			},
		};

		expect(txlib.reactIntlToPo(trnObjs)).toEqual(expected);
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

		const expected = {
			id1: {
				msgid: 'id1',
				msgstr: ['id1 text'],
				comments: {
					extracted: 'text for test',
					reference: 'text.txt:2:5',
				},
			},
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
		expect(txlib.mergeLocalTrns([msg1, msg2])).toEqual(expected);
		// expected error from duplicate msgs
		expect(() => txlib.mergeLocalTrns([msg1, msg1])).toThrow();
	});
});
