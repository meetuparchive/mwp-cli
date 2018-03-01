const { promisify } = require('util');
const google = require('googleapis');
const gapi = google.appengine('v1').apps;

// promisified API (callbacks are annoying)
module.exports = {
	operations: {
		get: promisify(gapi.operations.get),
	},
	versions: {
		list: promisify(gapi.services.versions.list),
		get: promisify(gapi.services.versions.get),
		create: promisify(gapi.services.versions.create),
		patch: promisify(gapi.services.versions.patch),
		del: promisify(gapi.services.versions.delete),
		instances: {
			list: promisify(gapi.services.versions.instances.list),
		},
	},
	services: {
		get: promisify(gapi.services.get),
		patch: promisify(gapi.services.patch),
	},
	auth: () =>
		new Promise((resolve, reject) => {
			google.auth.getApplicationDefault((err, auth, appsId) => {
				if (err) {
					reject(err);
					return;
				}
				if (auth.createScopedRequired && auth.createScopedRequired()) {
					auth = auth.createScoped([
						'https://www.googleapis.com/auth/appengine.admin',
						'https://www.googleapis.com/auth/cloud-platform',
					]);
				}
				resolve({ auth, appsId });
				return;
			});
		}),
};
