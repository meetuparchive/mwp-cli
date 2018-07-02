const customProperties = require('swarm-constants/dist/js/customProperties.js').customProperties;

module.exports = {
    loader: 'postcss-loader',
    options: {
        ident: 'postcss',
        plugins: loader => [
            require('postcss-cssnext')({
                browsers: ['last 2 versions', 'not ie <= 10'],
                features: {
                    customProperties: false,
                    colorFunction: false,
                },
            }),
            require('postcss-css-variables')({
                preserve: true,
                variables: customProperties,
                preserveInjectedVariables: false,
            })
        ]
    }
};
