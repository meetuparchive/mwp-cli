const core = {
	presets: ['flow', 'react', 'stage-2'],
	plugins: [['react-intl', { extractSourceLocation: true }]],
};

module.exports = {
	presets: {
		browser: [
			...core.presets,
			[
				'env',
				{
					targets: {
						browsers: [
							'last 2 versions',
							'not ie < 11',
							'android >= 4.2',
						],
					},
				},
			],
		],
		server: [...core.presets, ['env', { targets: { node: 'current' } }]],
	},
	plugins: {
		browser: [...core.presets],
		server: [...core.presets],
	},
};
