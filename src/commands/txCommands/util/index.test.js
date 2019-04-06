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
	objDiff,
	reduceUniques,
} = require('./index');

const LOCALES = ['en-US', 'fr-FR', 'es', 'es-ES'];
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

		expect(objDiff(mock)).toEqual(expected);
	});

	it('merge objects, throw error if dupe key', () => {
		// expected success
		expect(reduceUniques([PO_OBJ, PO_OBJ_SECONDARY])).toMatchSnapshot();
		// expected error from duplicate msgs
		expect(() => reduceUniques([PO_OBJ, PO_OBJ])).toThrow();
	});
});
