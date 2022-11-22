const fetch = require('node-fetch');
const {
	package: { txProject: PROJECT },
} = require('mwp-config');
const poFormatters = require('./poFormatters');

const ALL_TRANSLATIONS_RESOURCE = 'all_translations';
const MASTER_RESOURCE = 'master';
const PROJECT_MASTER = `${PROJECT}-master`; // separate project so translators don't confuse with branch content

const ORGANIZATION = 'meetup';
const API = 'https://rest.api.transifex.com';
const MAX_LIMIT = 1000;

const { TX_TOKEN } = process.env;

const TransifexApi = (function(options = {}) {
	const authHeader = `Bearer ${TX_TOKEN}`;
	const organization = options.organization || ORGANIZATION;
	const project = options.project || PROJECT;

	const fetchResourceTranslations = options => {
		const { next, resource, language } = options;

		const url =
			next ||
			`${API}/resource_translations?${new URLSearchParams({
				'filter[resource]': `o:${organization}:p:${project}:r:${resource}`,
				'filter[language]': `l:${language}`,
				include: 'resource_string',
				limit: MAX_LIMIT,
			})}`;

		return fetch(url, {
			method: 'GET',
			headers: {
				authorization: authHeader,
			},
		})
			.then(response => response.json())
			.catch(err =>
				console.error(
					`Error while executing fetchResourceTranslations: ${err}`
				)
			);
	};

	const fetchResourceStrings = options => {
		const { next, resource, project } = options;
		const url =
			next ||
			`${API}/resource_strings?${new URLSearchParams({
				'filter[resource]': `o:${ORGANIZATION}:p:${project}:r:${resource}`,
				limit: MAX_LIMIT,
			})}`;

		return fetch(url, {
			method: 'GET',
			headers: {
				authorization: authHeader,
			},
		})
			.then(response => response.json())
			.catch(err =>
				console.error(
					`Error while executing fetchResourceTranslations: ${err}`
				)
			);
	};

	const fetchProjectResourcesList = () => {
		const url = `${API}/resources?${new URLSearchParams({
			'filter[project]': `o:${organization}:p:${project}`,
		})}`;

		return fetch(url, {
			method: 'GET',
			headers: {
				authorization: authHeader,
			},
		})
			.then(response => response.json())
			.then(response => response.data.map(data => data.attributes.slug))
			.catch(err => console.error(`fetchProjectResourcesList error: ${err}`));
	};

	const isResourceExists = resource =>
		fetchProjectResourcesList().then(list => list.includes(resource));

	const uploadsResourceStrings = (resource, poObjectContent) => {
		const url = `${API}/resource_strings_async_uploads`;
		const content = poFormatters.poObjToPoString(poObjectContent);
		const resourceId = `o:${organization}:p:${project}:r:${resource}`;
		console.log(`Updating resource with id: ${resourceId}`);

		return fetch(url, {
			method: 'POST',
			headers: {
				authorization: authHeader,
				accept: 'application/vnd.api+json',
				'content-type': 'application/vnd.api+json',
			},
			body: JSON.stringify({
				data: {
					attributes: {
						callback_url: null,
						replace_edited_strings: false,
						content: content,
						content_encoding: 'text',
					},
					relationships: {
						resource: {
							data: {
								id: resourceId,
								type: 'resources',
							},
						},
					},
					type: 'resource_strings_async_uploads',
				},
			}),
		})
			.then(response => response.json())
			.catch(err => console.error(`uploadsResourceStrings error: ${err}`));
	};

	const getResourceTranslations = async (resource, language) => {
		let hasNext = true,
			next = null,
			result = {};
		while (hasNext) {
			const options = {
				next,
				resource,
				language,
			};
			const response = await fetchResourceTranslations(options);
			next = response.links.next;
			result = poFormatters.resourceTranslationsToPoObj(response, result);
			hasNext = Boolean(next);
		}

		return result;
	};

	const getResourceStrings = async (resource, project = PROJECT) => {
		let hasNext = true,
			next = null,
			result = {};
		while (hasNext) {
			const options = {
				next,
				resource,
				project,
			};
			const response = await fetchResourceStrings(options);
			next = response.links.next;
			result = poFormatters.resourceStringsToPoObj(response.data, result);
			hasNext = Boolean(next);
		}

		return result;
	};

	const createResource = resource => {
		const url = `${API}/resources`;

		return fetch(url, {
			method: 'POST',
			headers: {
				authorization: authHeader,
				'content-type': 'application/vnd.api+json',
			},
			body: JSON.stringify({
				data: {
					attributes: {
						name: resource,
						slug: resource,
					},
					relationships: {
						i18n_format: {
							data: {
								type: 'i18n_formats',
								id: 'PO',
							},
						},
						project: {
							data: {
								id: `o:${organization}:p:${project}`,
								type: 'projects',
							},
						},
					},
					type: 'resources',
				},
			}),
		})
			.then(response => response.json())
			.catch(err => console.error(`createResource error: ${err}`));
	};

	const deleteResource = resource => {
		const url = `${API}/resources/o:${organization}:p:${project}:r:${resource}`;

		return fetch(url, {
			method: 'DELETE',
			headers: {
				authorization: authHeader,
			},
		}).catch(err => console.error(`deleteResource error: ${err}`));
	};

	const getAllStrings = (filter = () => true, project = PROJECT) =>
		fetchProjectResourcesList()
			.then(resources =>
				Promise.all(
					resources
						.filter(filter)
						.map(resource => getResourceStrings(resource, project))
				)
			)
			.then(resourcesStrings =>
				resourcesStrings.reduce(
					(acc, resourceStrings) => Object.assign(acc, resourceStrings),
					{}
				)
			);

	return {
		ALL_TRANSLATIONS_RESOURCE,
		MASTER_RESOURCE,
		PROJECT_MASTER,
		fetchProjectResourcesList,
		isResourceExists,
		getResourceTranslations,
		getResourceStrings,
		uploadsResourceStrings,
		createResource,
		deleteResource,
		getAllStrings,
	};
})();

module.exports = {
	TransifexApi,
};
