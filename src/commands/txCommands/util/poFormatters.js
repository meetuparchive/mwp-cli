const gettextParser = require('gettext-parser');

/**
 * type PoObj = {
 *   string: {  // msgid
 *     msgid: string,
 *     msgstr: string,
 *     comments: {
 *       extracted: string,  // description.text
 *       translator: string, // description.jira
 *       reference: string,  // filename:start:end
 *     }
 *   }
 * }
 *
 * type MessageDescriptor (defined by react-intl)
 *
 * type MessageObj = {
 *   [id: string]: string
 * }
 */

// return object that is a map of trn keys/ids to translated copy - remove
// extraneous metadata from Po file content
// fileString => PoObj
const poStringToPoObj = fileContent => {
	const poTrn = gettextParser.po.parse(fileContent).translations['']; // yes, a blank string as a key
	// translations object includes unusable empty string key - remove it
	delete poTrn[''];
	return Object.keys(poTrn).reduce((acc, key) => {
		if (poTrn[key].msgstr[0]) {
			// effectively filtering out empty trn content
			acc[key] = poTrn[key];
		}
		return acc;
	}, {});
};

// take a set of PoTrn and compile a po file contents string
const poObjToPoString = poObj => {
	// sort the object to help make PO file output deterministic
	const sortedPoObj = Object.keys(poObj)
		.sort()
		.reduce((acc, key) => ({ ...acc, [key]: poObj[key] }), {});
	const headerWrapped = {
		charset: 'utf-8',
		headers: {
			'content-type': 'text/plain; charset=utf-8',
		},
		translations: {
			'': sortedPoObj,
		},
	};
	return `${gettextParser.po.compile(headerWrapped).toString()}\n`;
};

/**
 * Convert array of message descriptors into a PO object
 *   Array<MessageDescriptor> => Po
 *
 * https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html
 *
 * This transform includes special handling of the `description` parameter
 * - `description.text` will be assigned to `comments.extracted`.
 * - all other `description` key/values will be converted to a 'key: value; ...'
 *   string and assigned to `comments.translator`, e.g.
 *
 * ```
 * description = {
 * 	text: 'info for translator',
 *  jira: 'whatever',
 *  pivotal: 'something else'
 * }
 * ```
 *
 * yields:
 *
 * ```
 * comments: {
 *  text: 'info for translator',
 *  translator: 'jira: whatever; pivotal: asdfasdf'
 *  ...
 * }
 * ```
 */
const msgDescriptorsToPoObj = messages =>
	messages.reduce((acc, msg) => {
		const { text, ...otherDesc } = (msg && msg.description) || {};

		acc[msg.id] = {
			msgid: msg.id,
			msgstr: [msg.defaultMessage],
			comments: {
				extracted: text,
				translator: Object.keys(otherDesc)
					.map(k => `${k}: ${otherDesc[k]}`)
					.join('; '),
				reference: `${msg.file}:${msg.start.line}:${msg.start.column}`,
			},
		};

		return acc;
	}, {});

// required fields for resource creation and updating. http://docs.transifex.com/api/resources/#post
const poStringToPoResource = (slug, content) => ({
	slug,
	name: slug,
	i18n_type: 'PO',
	content,
});

const poObjToMsgObj = trns =>
	Object.keys(trns).reduce((acc, key) => {
		acc[key] = trns[key].msgstr[0];
		return acc;
	}, {});

const resourceStringToPoObj = resourceString => ({
	[resourceString.attributes.key]: {
		msgid: resourceString.attributes.key,
		comments: {
			translator: resourceString.attributes.developer_comment,
			reference: resourceString.attributes.occurrences,
		},
		msgstr: [resourceString.attributes.strings.other],
	},
});

const resourceStringsToPoObj = (data, source = {}) => {
	return data.reduce((acc, item) => {
		return {
			...acc,
			...resourceStringToPoObj(item),
		};
	}, source);
};

const resourceTranslationsToPoObj = (response, source) =>
	response.included.reduce((acc, inc, i) => {
		const translatedStrings = response.data[i].attributes.strings;
		return {
			...acc,
			[inc.attributes.key]: {
				msgid: inc.attributes.key,
				comments: {
					translator: inc.attributes.developer_comment,
					reference: inc.attributes.occurrences,
				},
				msgstr: [
					translatedStrings
						? translatedStrings.other
						: inc.attributes.strings.other,
				],
			},
		};
	}, source);

module.exports = {
	poStringToPoObj,
	poObjToPoString,
	poObjToMsgObj,
	poStringToPoResource,
	msgDescriptorsToPoObj,
	resourceStringsToPoObj,
	resourceTranslationsToPoObj,
};
