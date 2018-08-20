module.exports = (config, { versions, operations }) => {
	const { version, versionIds, force } = config;
	return {
		create: () => {
			const { noExisting, noNewer } = versions.validate;
			console.log(
				`Creating ${version} deployment:`,
				`versions ${versionIds.join(', ')}`
			);
			const validations = force ? [noNewer()] : [noExisting(), noNewer()];
			return Promise.all(validations).then(() =>
				Promise.all(versionIds.map(versions.create))
			);
		},
		del: () =>
			versions
				.stop(versionIds.map(id => ({ id })))
				.then(() => Promise.all(
					versionIds.map(versions.deleteSafe)
				)
			),
	};
};
