const apiMiddleware = require('../deployUtils/apiMiddleware');

const { CI_BUILD_NUMBER } = process.env;

/**
 * This command will make a simple attempt to STOP the specified version. If
 * another operation is already being performed on the version (e.g. it is still
 * in the process of deploying), it will fail with an error message but will not
 * return a non-zero exit code.
 *
 * Use this command to free up the instance resources being consumed by a deployment
 * that has been set to SERVING status
 */
module.exports = {
	command: 'stop',
	description: 'stop the specified version',
	builder: yargs =>
		yargs.options({
			versionId: {
				default: CI_BUILD_NUMBER, // defaults to stopping 'current' deployment
				demandOption: true,
				describe: 'The version ID to stop',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv =>
		argv
			.getDeployApi()
			.then(api => api.versions.stop(argv.versionIds.map(id => ({ id }))))
			.catch(err => console.error(err)),
};
