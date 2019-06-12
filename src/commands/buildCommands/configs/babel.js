const core = {
	compact: true,
	presets: ['@babel/preset-env', 'flow', 'react'],
	plugins: [
		'transform-class-properties',
		['react-intl', { extractSourceLocation: true }],
		[
			'transform-runtime',
			{
				polyfill: false,
				regenerator: true,
			},
        ],
        // equivalent to deprecated stage-2 presets
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-decorators',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-function-sent',
        '@babel/plugin-proposal-json-strings',
        '@babel/plugin-proposal-numeric-separator',
        '@babel/plugin-proposal-throw-expressions',
        '@babel/plugin-syntax-dynamic-import',
        '@babel/plugin-syntax-import-meta',
        '@babel/plugin-transform-flow-strip-types'
	],
};

module.exports = {
	presets: {
		browser: [
			...core.presets,
			[
				'env',
				{
					targets: {
						browsers: ['last 2 versions', 'not ie < 11', 'android >= 4.2'],
					},
				},
			],
		],
		server: [...core.presets, ['env', { targets: { node: 'current' } }]],
	},
	plugins: {
		browser: [...core.plugins],
		server: [...core.plugins],
	},
};
