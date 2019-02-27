jest.mock('mwp-config');
jest.mock('glob');
jest.mock('fs', () => ({
	readFileSync: filename => `# WP-1234
	#: src/path/to/${filename}.trns.jsx:1:2
	msgid "mockMessage.id"
	msgstr "mock translated copy"
	
	# WP-2345
	#: src/path/to/${filename}.trns.jsx:3:4
	msgid "mockMessage.id.${filename}"
	msgstr "mock translated copy from ${filename}"`,
	existsSync: () => true,
}));

const glob = require('glob');

const {
	getAllLocalPoContent,
	getLocalLocaleMessages,
	poObjToPoString,
	diff,
	filterPoContentByKeys,
	getLocalTrnSourcePo,
	MASTER_RESOURCE,
	reduceUniques,
	poStringToPoObj,
	poObjToMsgObj,
	poToUploadFormat,
	PROJECT,
	PROJECT_MASTER,
	msgDescriptorsToPoObj,
	readTfxResource,
	getTfxResources,
	getTfxResourcesComplete,
	getTfxResourcesIncomplete,
	getTfxMaster,
	updateTfxResource,
	uploadTrnsMaster,
	updateMasterContent,
	updateAllTranslationsResource,
	updateTranslations,
} = require('./index');

const LOCALES = ['en-US', 'fr-FR', 'es', 'es-ES'];
const PO_FILE_CONTENT = `# WP-1234
#: src/path/to/component.trns.jsx:4:45
msgid "mockMessage.id"
msgstr "mock translated copy"`;

const PO_OBJ = {
	'mockMessage.id': {
		comments: {
			reference: 'src/path/to/component.trns.jsx:4:45',
			translator: 'WP-1234',
		},
		msgid: 'mockMessage.id',
		msgstr: ['mock translated copy'],
	},
};

const PO_OBJ_SECONDARY = {
	'mockMessage.id.2': {
		comments: {
			extracted: 'text for test v2',
			reference: 'text2.txt:10:10',
		},
		msgid: 'mockMessage.id.2',
		msgstr: ['id2 text'],
	},
};

describe('poStringToPoObj', () => {
	it('parses PO-formatted file content into a plain JS object map', () => {
		expect(poStringToPoObj(PO_FILE_CONTENT)).toMatchSnapshot();
	});
	it('does not return empty trn content', () => {
		const PO_EMPTY_TRN = `# WP-1234
#: src/path/to/component.trns.jsx:4:45
msgid "mockMessage.id"
msgstr "" # this is intentionally empty - edge case`;
		expect(poStringToPoObj(PO_EMPTY_TRN)).toEqual({});
	});
});

describe('poObjToPoString', () => {
	it('takes trn content, returns po file', () => {
		const val = poObjToPoString(PO_OBJ);
		expect(val).toMatchSnapshot(`
"msgid \\"\\"
msgstr \\"Content-Type: text/plain; charset=utf-8\\\\n\\"

# WP-1234
#: src/path/to/component.trns.jsx:4:45
msgid \\"mockMessage.id\\"
msgstr \\"mock translated copy\\"
"
`);
	});
});

test('poObjToPoString -> poStringToPoObj', () => {
	// ensure these functions are reciprocal
	const poString = poObjToPoString(PO_OBJ);
	const poObj = poStringToPoObj(poString);
	expect(poObj).toEqual(PO_OBJ);
});

describe('getAllLocalPoContent', () => {
	glob.__setMockFiles(LOCALES.map(l => `${l}.po`));
	it('returns an array of tuples of localecode (filename) and object of trns', () => {
		const output = getAllLocalPoContent();
		expect(output.length).toBe(LOCALES.length);
		expect(output[0]).toMatchSnapshot();
	});
});

describe('getLocalLocaleMessages', () => {
	it('returns an Object that maps locales to messages', () => {
		const output = getLocalLocaleMessages();
		expect(output).toMatchSnapshot();
	});
});

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

		expect(diff(mock)).toEqual(expected);
	});

	it('convert message descriptor objects into po style objects', () => {
		const messageDescriptors = [
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

		expect(msgDescriptorsToPoObj(messageDescriptors)).toMatchSnapshot();
	});

	it('merge objects, throw error if dupe key', () => {
		// expected success
		expect(reduceUniques([PO_OBJ, PO_OBJ_SECONDARY])).toMatchSnapshot();
		// expected error from duplicate msgs
		expect(() => reduceUniques([PO_OBJ, PO_OBJ])).toThrow();
	});

	it('takes po objects and returns tx upload format', () => {
		expect(poToUploadFormat(PO_OBJ)).toMatchSnapshot();
	});

	it('takes po objects and returns react intl format', () => {
		expect(poObjToMsgObj(PO_OBJ)).toMatchSnapshot();
	});

	it('filters po content by keys', () => {
		const keys = ['mockMessage.id'];
		const val = filterPoContentByKeys(keys, PO_OBJ);
		expect(val).toMatchSnapshot();
	});

	it('loads resource list and sorts by date modified', () =>
		getTfxResources().then(resources => {
			expect(resources).toMatchSnapshot();
		}));
});
