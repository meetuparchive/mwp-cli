const chalk = require('chalk');
const cloudApi = require('./cloudApi');

/*
* Operations on versions (e.g. deploying, starting) have some specific 'status'
* info that is useful to log - this is just a wrapper around the basic
* 'checkOperation' function
*/

/*
* Long-running processes in GCP will be assigned an 'operation' that can be polled
* to determine its status. This function polls for operation data every config.pollWait
* millseconds and logs summary information until the operation is marked 'done'
*
* https://cloud.google.com/appengine/docs/admin-api/reference/rest/v1/apps.operations
*/
module.exports = config => {
	const { auth, appsId, indent } = config;
	const track = operation => {
		let currentStatus = '';
		const doCheck = () =>
			cloudApi.operations
				.get({
					auth,
					appsId,
					operationsId: operation.name.match(/\/([^/]+)$/)[1],
				})
				.then(op => {
					const status =
						op.metadata.ephemeralMessage || 'processing...';
					if (status !== currentStatus) {
						console.log(indent, 'status:', chalk.yellow(status));
						currentStatus = status;
					}
					if (op.done) {
						// when `done` is `true`, op.response will be the entity operated on
						console.log(indent, 'status:', chalk.green('Done'));
						if (op.error) {
							throw new Error(op.error.message);
						}
						return op.response;
					}
					// recurse after timeout
					console.log(
						chalk.gray(`waiting ${config.pollWait / 1000}sec...`)
					);
					return new Promise(resolve =>
						setTimeout(() => {
							resolve(doCheck(op));
						}, config.pollWait)
					);
				});
		return doCheck();
	};
	return { track };
};
