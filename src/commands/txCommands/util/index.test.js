const transifex = require('transifex');
const txlib = require('./index');

describe('trn utils', () => {
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
		expect(txlib.reduceUniques([msg1, msg2])).toMatchSnapshot();
		// expected error from duplicate msgs
		expect(() => txlib.reduceUniques([msg1, msg1])).toThrow();
	});

	it('takes po objects and returns tx upload format', () => {
		expect(txlib.poToUploadFormat(msg1)).toMatchSnapshot();
	});

	it('takes po objects and returns react intl format', () => {
		expect(txlib.poToReactIntlFormat(msg1)).toMatchSnapshot();
	});

	it('filters po content by keys', done => {
		const keys = ['id1'];
		txlib
			.filterPoContentByKeys$(keys, msg1)
			.subscribe(val => expect(val).toMatchSnapshot(), null, done);
	});

	it('takes po file content, extract trn content', () => {
		const fileContent = `msgid ""
msgstr "Content-Type: text/plain; charset=utf-8\n"

# MW-000
#: src/components/EventCard.jsx:27:16
msgid "event.oneMemberWent"
msgstr "1 Mitglied ging"
`;
		txlib
			.parsePluckTrns(fileContent)
			.subscribe(val => expect(val).toMatchSnapshot());
	});

	it('takes trn content, returns po file', () => {
		const poObj = {
			'event.oneMemberWent': {
				comments: {
					reference: 'src/components/EventCard.jsx:27:16',
					translator: 'MW-000',
				},
				msgid: 'event.oneMemberWent',
				msgstr: ['1 Mitglied ging'],
			},
		};

		txlib
			.wrapCompilePo$(poObj)
			.subscribe(val => expect(val).toMatchSnapshot());
	});

	it('loads resource list and sorts by date modified', () =>
		txlib.getTfxResources().then(resources => {
			expect(resources).toMatchSnapshot();
		}));
});
