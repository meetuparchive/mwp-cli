module.exports = {
	command: 'clean',
	description: 'stop older versions, clean up oldest versions',
	builder: yargs =>
		yargs.options({
			serving: {
				default: 4,
				describe: 'Number of versions to keep running',
			},
			available: {
				default: 25,
				describe: 'Number of versions to keep available',
			},
		}),
	hander: argv =>
		argv
			.getApi()
			.then(({ deploy, versions, migrate }) => {
				console.log('okay');
			})
			.catch(err => console.error(err)),
};
