module.exports = {
	babel: require('./babel'),
	env: require('./env'),
	locales: require('./locales'),
	package: require('./package'),
	paths: require('./paths'),
	webpack: require('./webpack'),
	getServer: () => require('./server'), // this is a getter because it validates environment config at runtime
};
