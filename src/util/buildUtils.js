const webpackDir = `${process.cwd()}/scripts/webpack`;

const getBrowserAppConfig = require(`${webpackDir}/browserAppConfig`);
const getServerAppConfig = require(`${webpackDir}/serverAppConfig`);
const settings = require(`${webpackDir}/settings`);

module.exports = {
	getBrowserAppConfig,
	getServerAppConfig,
	settings,
};
