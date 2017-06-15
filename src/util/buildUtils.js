const webpackDir = `${process.cwd()}/scripts/webpack`;

const appServerConfig = require(`${webpackDir}/appServerConfig`);
const getBrowserAppConfig = require(`${webpackDir}/browserAppConfig`);
const getServerAppConfig = require(`${webpackDir}/serverAppConfig`);
const settings = require(`${webpackDir}/settings`);

module.exports = {
	appServerConfig,
	getBrowserAppConfig,
	getServerAppConfig,
	settings,
};
