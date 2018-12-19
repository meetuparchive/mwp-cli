const apiMiddleware = require('../deployUtils/apiMiddleware');

const { CI_BUILD_NUMBER } = process.env;

module.exports = {
	command: 'delete',
	describe: 'safely delete a specified deployment',
	builder: yargs =>
		yargs.options({
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to delete',
			},
		}),
	middlewares: [apiMiddleware],
	handler: argv => argv.getDeployApi().then(({ deploy }) => deploy.del()),
};
