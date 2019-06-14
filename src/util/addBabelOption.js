const addBabelOption = yargs => {
	yargs.option('babel', {
		alias: 'config',
		description: 'path for babel config',
		demandOption: true,
		type: 'string'
	});
};

module.exports = addBabelOption;
