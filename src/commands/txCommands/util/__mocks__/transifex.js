const transifex = require.requireActual('transifex');

const PO_STRING = `# WP-1234
#: packages/mupweb-legacy/src/path/to/component.trns.jsx:4:45
msgid "mockMessage.id"
msgstr "mock translated copy"`;

transifex.prototype.projectInstanceMethods = (project, cb) => {
	cb(null, {
		resources: [
			{
				slug: 'resource_1_slug',
				name: 'resource_1_slug',
			},
			{
				slug: 'resource_2_slug',
				name: 'resource_2_slug',
			},
		],
	});
};

transifex.prototype.resourcesInstanceMethods = (project, slug, cb) => {
	const response = {
		resource_1_slug: {
			slug: 'resource_1_slug',
			last_update: '2017-07-20T18:53:47.836',
		},
		resource_2_slug: {
			slug: 'resource_2_slug',
			last_update: '2017-07-20T20:02:24.497',
		},
	};
	cb(null, response[slug]);
};

transifex.prototype.sourceLanguageMethods = (project, slug, cb) => {
	cb(null, PO_STRING);
};

transifex.prototype.resourceCreateMethod = jest.fn((project, poResource, cb) => {
	cb(null);
});

transifex.prototype.resourceDeleteMethod = jest.fn((project, slug, cb) => {
	cb(null);
});

transifex.prototype.uploadTranslationInstanceMethod = jest.fn(
	(project, slug, lang_tag, poResource, cb) => {
		cb(null);
	}
);

transifex.prototype.statisticsMethods = jest.fn((project, slug, cb) => {
	const slugMap = {
		resource_1_slug: {
			'en-US': { completed: '50%' },
			'fr-FR': { completed: '100%' },
		},
		resource_2_slug: { 'en-US': { completed: '100%' } },
	};
	cb(null, slugMap[slug]);
});

transifex.prototype.translationInstanceMethod = jest.fn(
	(project, slug, lang_tag, cb) => {
		cb(null, PO_STRING);
	}
);

transifex.prototype.uploadSourceLanguageMethod = jest.fn(
	(project, slug, poResource, cb) => {
		cb();
	}
);

module.exports = transifex;
