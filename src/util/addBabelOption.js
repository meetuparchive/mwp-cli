const addBabelOption = yargs => {
	yargs.option('babelConfig', {
		description: 'path to file for babel-loader options',
		demandOption: true,
		type: 'string',
	});
};

module.exports = addBabelOption;
