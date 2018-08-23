const postcssPresetEnv = require('postcss-preset-env');
const customProperties = require('swarm-constants/dist/js/customProperties.js').customProperties;

module.exports = {
    loader: 'postcss-loader',
    options: {
        ident: 'postcss',
        plugins: loader => [
            postcssPresetEnv({
                stage: 0, // most unstable features/stage, but most similar to postcss-cssnext
                browsers: ['last 2 versions', 'not ie <= 10'],
                features: {
                    'custom-properties': false,
                    'color-mod-function': false,
                }
            }),
            require('postcss-css-variables')({
                preserve: true,
                variables: customProperties,
                preserveInjectedVariables: false,
            }),
            require('cssnano')({
                preset: 'default',
            })
        ]
    }
};
