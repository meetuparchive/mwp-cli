const apiMiddleware = require('../deployUtils/apiMiddleware');

const { CI_BUILD_NUMBER } = process.env;

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
	handler: argv => {
		return argv
			.getDeployApi()
			.then(api => api.versions.stop(argv.versionIds.map(id => ({ id }))))
			.catch(err => console.error(err));
		// should we wait to retry if version is currently still deploying?
	},
};
