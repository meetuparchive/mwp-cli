jest.mock("./logger", () => {
	const success = jest.fn();
	const error = jest.fn();

	return {
		error,
		success,
		logSuccess: () => x => {
			success();
			return x;
		},
		logError: () => err => {
			error();
			throw err;
		}
	};
});

const { error, success } = require("./logger");
const { resource, project } = require("./transifex");

afterEach(() => {
	success.mockClear();
	error.mockClear();
});

const SLUG = "WP_test_slug";
const PO_FILE_CONTENT = `# WP-1234
#: src/path/to/component.trns.jsx:4:45
msgid "mockMessage.id"
msgstr "mock translated copy"`;

const PO_OBJ = {
	"mockMessage.id": {
		comments: {
			reference: "src/path/to/component.trns.jsx:4:45",
			translator: "WP-1234"
		},
		msgid: "mockMessage.id",
		msgstr: ["mock translated copy"]
	}
};

test("resource.pullAll", () => {
	return resource.pullAll(SLUG).then(response => {
		expect(response).toMatchInlineSnapshot(`
Object {
  "mockMessage.id": Object {
    "comments": Object {
      "reference": "src/path/to/component.trns.jsx:4:45",
      "translator": "WP-1234",
    },
    "msgid": "mockMessage.id",
    "msgstr": Array [
      "mock translated copy",
    ],
  },
}
`);
	});
});

test("resource.pullLang", () =>
	resource.pullLang(SLUG, "en-US").then(poObj => {
		expect(poObj).toMatchInlineSnapshot(`
Object {
  "mockMessage.id": Object {
    "comments": Object {
      "reference": "src/path/to/component.trns.jsx:4:45",
      "translator": "WP-1234",
    },
    "msgid": "mockMessage.id",
    "msgstr": Array [
      "mock translated copy",
    ],
  },
}
`);
	}));

test("resource.list", () =>
	resource.list().then(resources => {
		expect(resources).toMatchInlineSnapshot(`
Array [
  "resource_1_slug",
  "resource_2_slug",
]
`);
	}));

test("resource.listComplete", () =>
	resource.listComplete().then(resources =>
		expect(resources).toMatchInlineSnapshot(`
Array [
  "resource_2_slug",
]
`)
	));

test("resource.listIncomplete", () =>
	resource.listIncomplete().then(resources =>
		expect(resources).toMatchInlineSnapshot(`
Array [
  Array [
    "resource_1_slug",
    Object {
      "en-US": "50%",
    },
  ],
]
`)
	));

test("resource.updateCopy", () =>
	resource
		.updateCopy(["en-US", PO_FILE_CONTENT], "resource_1_slug")
		.then(() => expect(success).toHaveBeenCalled()));

test("resource.updateSrc", () =>
	resource
		.updateSrc("resource_1_slug", PO_OBJ)
		.then(() => expect(success).toHaveBeenCalled()));

test("resource.exists", () =>
	resource
		.exists("resource_1_slug")
		.then(doesExist => expect(doesExist).toBe(true)));

test("resource.create", () =>
	resource.create(SLUG, PO_OBJ, "TEST_PROJECT").then(response => {
		expect(success).toHaveBeenCalled();
	}));

test("project.pullAll", () =>
	project.pullAll().then(resources =>
		expect(resources).toMatchInlineSnapshot(`
Object {
  "mockMessage.id": Object {
    "comments": Object {
      "reference": "src/path/to/component.trns.jsx:4:45",
      "translator": "WP-1234",
    },
    "msgid": "mockMessage.id",
    "msgstr": Array [
      "mock translated copy",
    ],
  },
}
`)
	));
