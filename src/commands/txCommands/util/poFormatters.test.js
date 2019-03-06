const { poStringToPoObj, poObjToPoString } = require('./poFormatters');

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

test.todo('msgDescriptorsToPoObj');
test.todo('poStringToPoResource');
test.todo('poObjToMsgObj');
