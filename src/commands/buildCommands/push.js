const fs = require('fs');
const zlib = require('zlib');

const tar = require('tar-fs');
const chalk = require('chalk');

const { package: packageConfig } = require('mwp-config');
const api = require('../buildUtils/cloudApi');

const { CI_BUILD_NUMBER } = process.env;
const packBundle = tag => {
	return targetFile;
};

const getArchiveDir = ({ serviceId, versionId }) => `${serviceId}-${versionId}`;

module.exports = {
	command: 'push',
	description: 'push the built app to cloud storage',
	builder: yargs =>
		yargs.options({
			versionId: {
				default: CI_BUILD_NUMBER,
				demandOption: true,
				describe: 'The version ID to pull',
			},
			serviceId: {
				default: packageConfig.gaeModuleId,
				describe: 'The GAE service name',
			},
			tag: {
				alias: 'lang',
				demandOption: true,
				describe: 'A descriptive tag for the bundle',
			},
		}),
	handler: argv => {
		const { versionId, serviceId, tag } = argv;
		return api.upload(
			`${getArchiveDir({ serviceId, versionId })}/archive-${tag}.tar`,
			tar.pack('./', { entries: ['./build'] })
		);
	},
};
