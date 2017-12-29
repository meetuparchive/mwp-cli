module.exports = (config, { versions, operations }) => {
	const { version, versionIds } = config;
	return {
		create: () => {
			const { noExisting, noNewer } = versions.validate;
			console.log(
				`Creating ${version} deployment:`,
				`versions ${versionIds.join(', ')}`
			);
			return Promise.all([noExisting(), noNewer()]).then(() =>
				Promise.all(versionIds.map(versions.create))
			);
		},
		del: () =>
			versions
				.stop(versionIds.map(id => ({ id })))
				.then(() => Promise.all(versionIds.map(versions.deleteSafe))),
	};
};
