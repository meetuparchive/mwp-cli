module.exports = {
	presets: {
		core: ['flow', 'react', 'stage-2'],
		browser: [
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
		server: [['env', { targets: { node: 'current' } }]],
	},
	plugins: {
		core: [['react-intl', { extractSourceLocation: true }]],
		browser: [],
		server: [],
	},
};
